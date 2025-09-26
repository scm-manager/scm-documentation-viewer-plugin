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

import { LexicalComposer } from "@lexical/react/LexicalComposer";
import React, { useEffect, useState } from "react";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import LexicalErrorBoundary from "@lexical/react/LexicalErrorBoundary";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { $convertToMarkdownString, $convertFromMarkdownString } from "@lexical/markdown";
// @ts-ignore
import editorStyle from "./MarkdownEditor.module.css";
import { ToolbarPlugin } from "./toolbar/ToolbarPlugin";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { CodeNode } from "@lexical/code";
import { LinkNode } from "@lexical/link";
import { ListItemNode, ListNode } from "@lexical/list";
import { HorizontalRuleNode } from "@lexical/react/LexicalHorizontalRuleNode";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { HorizontalRulePlugin } from "@lexical/react/LexicalHorizontalRulePlugin";
import { COMMAND_PRIORITY_CRITICAL, EditorState, FOCUS_COMMAND, KEY_ENTER_COMMAND, KEY_ESCAPE_COMMAND } from "lexical";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { MARKDOWN_TRANSFORMERS } from "./MarkdownTransformers";
import { TabIndentationPlugin } from "@lexical/react/LexicalTabIndentationPlugin";
import styled from "styled-components";

type OnChangeEvent = {
  getMarkdownString: () => Promise<string>;
};

type MarkdownEditorInstanceOptions = {
  onChange?: (event: OnChangeEvent) => void | Promise<void>;
};

const HeightLimitedEditor = styled.div`
  height: 20rem;
  overflow: auto;
  resize: vertical;
`;

export const useMarkdownEditor = (options: MarkdownEditorInstanceOptions = {}) => {
  const [editorState, setEditorState] = useState<EditorState>();

  const getMarkdownString = async (currentEditorState?: EditorState) =>
    new Promise<string>((resolve) => {
      if (!currentEditorState) {
        return resolve("");
      }

      currentEditorState.read(() => {
        resolve($convertToMarkdownString(MARKDOWN_TRANSFORMERS));
      });
    });

  const onStateChange = (currentEditorState: EditorState) => {
    setEditorState(currentEditorState);

    if (options.onChange) {
      options.onChange({
        getMarkdownString: () => getMarkdownString(currentEditorState),
      });
    }
  };

  return {
    onStateChange,
    getMarkdownString: () => getMarkdownString(editorState),
  };
};

type MarkdownEditorInstance = ReturnType<typeof useMarkdownEditor>;

type OnChangePluginProps = {
  editorInstance: MarkdownEditorInstance;
};

const OnChangePlugin = ({ editorInstance }: OnChangePluginProps) => {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorInstance.onStateChange(editorState);
    });
  }, [editor, editorInstance]);

  return null;
};

type AccessibilityFocusState = "FocusInEditor" | "FocusOnEditor";

type AccessibilityPluginProp = {
  setAccessibilityFocus: (state: AccessibilityFocusState) => void;
};

const AccessibilityPlugin = ({ setAccessibilityFocus }: AccessibilityPluginProp) => {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      KEY_ESCAPE_COMMAND,
      (_event) => {
        setAccessibilityFocus("FocusOnEditor");
        return true;
      },
      COMMAND_PRIORITY_CRITICAL,
    );
  }, [editor]);

  useEffect(() => {
    return editor.registerCommand(
      KEY_ENTER_COMMAND,
      (event) => {
        if (event?.ctrlKey) {
          setAccessibilityFocus("FocusInEditor");
          return true;
        }

        return false;
      },
      COMMAND_PRIORITY_CRITICAL,
    );
  }, [editor]);

  useEffect(() => {
    return editor.registerCommand(
      FOCUS_COMMAND,
      (_event) => {
        setAccessibilityFocus("FocusInEditor");
        return false;
      },
      COMMAND_PRIORITY_CRITICAL,
    );
  }, [editor]);

  return null;
};

const onError = (error: unknown) => {
  console.error(error);
};

type MarkdownEditorProps = {
  initialContent: string;
  editorInstance: MarkdownEditorInstance;
};

const EDITOR_NODES = [HeadingNode, QuoteNode, CodeNode, LinkNode, ListNode, ListItemNode, HorizontalRuleNode];

export const MarkdownEditor = ({ initialContent, editorInstance }: MarkdownEditorProps) => {
  const [accessibilityFocus, setAccessibilityFocus] = useState<AccessibilityFocusState>("FocusInEditor");

  return (
    <LexicalComposer
      initialConfig={{
        namespace: "markdownEditor",
        onError,
        editorState: () => $convertFromMarkdownString(initialContent, MARKDOWN_TRANSFORMERS),
        nodes: EDITOR_NODES,
        theme: {
          root: editorStyle.root,
          text: { strikethrough: editorStyle.strikethrough, italic: editorStyle.italic, bold: editorStyle.bold },
          code: editorStyle.codeBlock,
          list: {
            nested: {
              listitem: editorStyle.nestedListItem,
            },
          },
        },
      }}
    >
      <AccessibilityPlugin setAccessibilityFocus={setAccessibilityFocus} />
      <ToolbarPlugin />
        <HeightLimitedEditor className={"content"}>
          <RichTextPlugin
            contentEditable={<ContentEditable />}
            ErrorBoundary={LexicalErrorBoundary}
            placeholder={<></>}
          />
        </HeightLimitedEditor>
        <OnChangePlugin editorInstance={editorInstance} />
        <MarkdownShortcutPlugin transformers={MARKDOWN_TRANSFORMERS} />
        <LinkPlugin />
        <ListPlugin />
        <HorizontalRulePlugin />
        {accessibilityFocus === "FocusInEditor" ? <TabIndentationPlugin /> : null}
    </LexicalComposer>
);
};
