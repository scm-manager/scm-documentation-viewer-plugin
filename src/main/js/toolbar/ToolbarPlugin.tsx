/*
 * Copyright (c) 2020 - present Cloudogu GmbH
 *
 * This program is free software: you can redistribute it and/or modify it under
 * the terms of the GNU Affero General Public License as published by the Free
 * Software Foundation, version 3.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more
 * details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see https://www.gnu.org/licenses/.
 */

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  $isRootOrShadowRoot,
  $isTextNode,
  ElementNode,
  FORMAT_TEXT_COMMAND,
  TextFormatType,
} from "lexical";
import React, { useCallback, useEffect, useState } from "react";
import { $createListNode, $isListItemNode, $isListNode, ListNode } from "@lexical/list";
import { $setBlocksType } from "@lexical/selection";
import { $createQuoteNode, $isHeadingNode, $isQuoteNode } from "@lexical/rich-text";
import { $findMatchingParent, $getNearestBlockElementAncestorOrThrow, $getNearestNodeOfType } from "@lexical/utils";
import { $isLinkNode } from "@lexical/link";
import { $isHorizontalRuleNode, INSERT_HORIZONTAL_RULE_COMMAND } from "@lexical/react/LexicalHorizontalRuleNode";
import { $isDecoratorBlockNode, DecoratorBlockNode } from "@lexical/react/LexicalDecoratorBlockNode";
import { $createCodeNode, $isCodeNode } from "@lexical/code";
import { ToolbarButton, ToolbarButtonGroup, Toolbar } from "./Toolbar";
import CodeLanguageSelector from "./CodeLanguageSelector";
import { LinkEditor } from "./LinkEditor";
import { Modal } from "@scm-manager/ui-components";
import { useTranslation } from "react-i18next";
import { HeadingSelector } from "./HeadingSelector";

const blockTypeToBlockName = {
  bullet: "Bulleted List",
  check: "Check List",
  code: "Code Block",
  h1: "Heading 1",
  h2: "Heading 2",
  h3: "Heading 3",
  h4: "Heading 4",
  h5: "Heading 5",
  h6: "Heading 6",
  number: "Numbered List",
  paragraph: "Normal",
  quote: "Quote",
} as const;

type BlockType = keyof typeof blockTypeToBlockName;

type ToolbarState = {
  isBold: boolean;
  isItalic: boolean;
  isStrikeThrough: boolean;
  isCode: boolean;
  isLink: boolean;
  activeBlock: BlockType;
};

export const ToolbarPlugin = () => {
  const [editor] = useLexicalComposerContext();
  const [t] = useTranslation("plugins");
  const [isLinkEditMode, setLinkEditMode] = useState(false);
  const [toolbarState, setToolbarState] = useState<ToolbarState>({
    isBold: false,
    isItalic: false,
    isStrikeThrough: false,
    isCode: false,
    isLink: false,
    activeBlock: "paragraph",
  });

  const $updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) {
      return;
    }

    const anchorNode = selection.anchor.getNode();
    const parent = anchorNode.getParent();
    const isLink = $isLinkNode(parent) || $isLinkNode(anchorNode);

    let element =
      anchorNode.getKey() === "root"
        ? anchorNode
        : $findMatchingParent(anchorNode, (e) => {
            const parent = e.getParent();
            return parent !== null && $isRootOrShadowRoot(parent);
          });
    if (element === null) {
      element = anchorNode.getTopLevelElementOrThrow();
    }
    const elementKey = element.getKey();
    const elementDOM = editor.getElementByKey(elementKey);
    // Update toolbar state
    let activeBlock: BlockType = "paragraph";
    if (elementDOM !== null) {
      if ($isListNode(element)) {
        const parentList = $getNearestNodeOfType<ListNode>(anchorNode, ListNode);
        activeBlock = parentList ? parentList.getListType() : element.getListType();
      } else {
        const type = $isHeadingNode(element) ? element.getTag() : element.getType();
        if (type in blockTypeToBlockName) {
          activeBlock = type as BlockType;
        }
      }
    }

    setToolbarState({
      isBold: selection.hasFormat("bold"),
      isItalic: selection.hasFormat("italic"),
      isStrikeThrough: selection.hasFormat("strikethrough"),
      isCode: selection.hasFormat("code"),
      isLink,
      activeBlock,
    });
  }, [editor]);

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read($updateToolbar);
    });
  }, [editor, $updateToolbar]);

  const createInlineFormatter = (payload: TextFormatType) => {
    return () => {
      editor.update(() => {
        const section = $getSelection();
        if ($isRangeSelection(section)) {
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, payload);
        }
      });
    };
  };

  const createBlockFormatter = (createElement: () => ElementNode) => {
    return () => {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          $setBlocksType(selection, createElement);
        }
      });
    };
  };

  const addHorizontalRule = () => {
    editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined);
  };

  const clearFormat = () => {
    editor.update(() => {
      const selection = $getSelection();

      if ($isRangeSelection(selection)) {
        const nodes = selection.getNodes();
        const extractedNodes = selection.extract();
        const anchor = selection.anchor;
        const focus = selection.focus;

        nodes.forEach((node, idx) => {
          if ($isTextNode(node)) {
            // We split the first and last node by the selection
            // So that we don't format unselected text inside those nodes
            let textNode = node;

            // Only if at least one character is selected
            // Then remove text style
            if (anchor.key !== focus.key || anchor.offset !== focus.offset) {
              if (idx === 0 && anchor.offset !== 0) {
                textNode = textNode.splitText(anchor.offset)[1] || textNode;
              }
              if (idx === nodes.length - 1) {
                textNode = textNode.splitText(focus.offset)[0] || textNode;
              }

              /**
               * If the selected text has one format applied
               * selecting a portion of the text, could
               * clear the format to the wrong portion of the text.
               *
               * The cleared text is based on the length of the selected text.
               */
              // We need this in case the selected text only has one format
              const extractedTextNode = extractedNodes[0];
              if (nodes.length === 1 && $isTextNode(extractedTextNode)) {
                textNode = extractedTextNode;
              }

              if (textNode.__style !== "") {
                textNode.setStyle("");
              }
              if (textNode.__format !== 0) {
                textNode.setFormat(0);
                $getNearestBlockElementAncestorOrThrow(textNode).setFormat("");
              }
            }

            // Block formats should always be cleared
            // Even if 0 characters were selected
            const parent = textNode.getParent();
            if (
              $isHeadingNode(parent) ||
              $isQuoteNode(parent) ||
              $isCodeNode(parent) ||
              $isListNode(parent) ||
              $isListItemNode(parent)
            ) {
              parent.replace($createParagraphNode(), true);
            } else if ($isLinkNode(parent)) {
              parent.getChildren().map((children) => parent.insertBefore(children));
              parent.remove();
            } else if ($isDecoratorBlockNode(parent)) {
              const decoratorParent: DecoratorBlockNode = parent;
              decoratorParent.setFormat("");
            } else if ($isHorizontalRuleNode(parent)) {
              parent.remove();
            }
          }
        });
      }
    });
  };

  if (toolbarState.activeBlock === "code") {
    return (
      <Toolbar>
        <ToolbarButtonGroup>
          <ToolbarButton
            isActive={true}
            onClick={createBlockFormatter(() => $createCodeNode())}
            aria-label={"format-code-block"}
            icon="code"
          />
        </ToolbarButtonGroup>
        <ToolbarButtonGroup>
          <CodeLanguageSelector />
        </ToolbarButtonGroup>
        <ToolbarButtonGroup>
          <ToolbarButton isActive={false} onClick={clearFormat} aria-label={"format-clear"} icon="eraser" />
        </ToolbarButtonGroup>
      </Toolbar>
    );
  }
  return (
    <Toolbar>
      <ToolbarButtonGroup>
        <ToolbarButton
          isActive={toolbarState.activeBlock === "paragraph"}
          icon="paragraph"
          onClick={createBlockFormatter(() => $createParagraphNode())}
          aria-label={t("scm-documentation-viewer-plugin.editor.toolbar.paragraph")}
        />
        <HeadingSelector activeBlock={toolbarState.activeBlock} />
        <ToolbarButton
          isActive={toolbarState.activeBlock === "bullet"}
          onClick={createBlockFormatter(() => $createListNode("bullet"))}
          aria-label={t("scm-documentation-viewer-plugin.editor.toolbar.ul")}
          icon="list-ul"
        />
        <ToolbarButton
          isActive={toolbarState.activeBlock === "number"}
          onClick={createBlockFormatter(() => $createListNode("number"))}
          aria-label={t("scm-documentation-viewer-plugin.editor.toolbar.ol")}
          icon="list-ol"
        />
        <ToolbarButton
          isActive={toolbarState.activeBlock === "quote"}
          onClick={createBlockFormatter(() => $createQuoteNode())}
          aria-label={t("scm-documentation-viewer-plugin.editor.toolbar.quote")}
          icon="quote-right"
        />
        <ToolbarButton
          isActive={false}
          onClick={createBlockFormatter(() => $createCodeNode())}
          aria-label={t("scm-documentation-viewer-plugin.editor.toolbar.codeBlock")}
          icon="code"
        />
      </ToolbarButtonGroup>
      <Modal title="Link" active={isLinkEditMode} closeFunction={() => setLinkEditMode(false)}>
        {isLinkEditMode && <LinkEditor close={() => setLinkEditMode(false)}></LinkEditor>}
      </Modal>
      <ToolbarButtonGroup>
        <ToolbarButton
          isActive={toolbarState.isBold}
          onClick={createInlineFormatter("bold")}
          aria-label={t("scm-documentation-viewer-plugin.editor.toolbar.bold")}
          icon="bold"
        />
        <ToolbarButton
          isActive={toolbarState.isItalic}
          onClick={createInlineFormatter("italic")}
          aria-label={t("scm-documentation-viewer-plugin.editor.toolbar.italic")}
          icon="italic"
        />
        <ToolbarButton
          isActive={toolbarState.isStrikeThrough}
          onClick={createInlineFormatter("strikethrough")}
          aria-label={t("scm-documentation-viewer-plugin.editor.toolbar.strikethrough")}
          icon="strikethrough"
        />
        <ToolbarButton
          isActive={toolbarState.isLink}
          onClick={() => setLinkEditMode(true)}
          aria-label={t("scm-documentation-viewer-plugin.editor.toolbar.link")}
          icon="link"
        />
        <ToolbarButton
          isActive={toolbarState.isCode}
          onClick={createInlineFormatter("code")}
          aria-label={t("scm-documentation-viewer-plugin.editor.toolbar.code")}
          icon="code"
        />
      </ToolbarButtonGroup>
      <ToolbarButtonGroup>
        <ToolbarButton
          isActive={false}
          onClick={addHorizontalRule}
          aria-label={t("scm-documentation-viewer-plugin.editor.toolbar.hr")}
          icon="minus"
        />
      </ToolbarButtonGroup>
      <ToolbarButtonGroup>
        <ToolbarButton
          isActive={false}
          onClick={clearFormat}
          aria-label={t("scm-documentation-viewer-plugin.editor.toolbar.clear")}
          icon="eraser"
        />
      </ToolbarButtonGroup>
    </Toolbar>
  );
};
