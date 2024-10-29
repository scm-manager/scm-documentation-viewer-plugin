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

import React, { FormEvent, useEffect, useState } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getSelection, $isRangeSelection } from "lexical";
import { $findMatchingParent } from "@lexical/utils";
import { $createLinkNode, $isLinkNode, TOGGLE_LINK_COMMAND } from "@lexical/link";
import { InputField } from "@scm-manager/ui-components";
import { Button } from "@scm-manager/ui-buttons";

type LinkEditorProps = {
  close: () => void;
};

export const LinkEditor = ({ close }: LinkEditorProps) => {
  const [href, setHref] = useState("");
  const [content, setContent] = useState("");
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const node = selection.anchor.getNode();
        const linkParent = $findMatchingParent(node, $isLinkNode);
        if (linkParent) {
          setHref(linkParent.getURL());
          setContent(linkParent.getTextContent());
        } else {
          setContent(selection.getTextContent());
        }
      }
    });
  }, [editor]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    editor.update(() => {
      const selection = $getSelection();

      if ($isRangeSelection(selection)) {
        const node = selection.anchor.getNode();
        const linkParent = $findMatchingParent(node, $isLinkNode);

        if (linkParent) {
          linkParent.remove(true);
        }

        selection.removeText();
        selection.insertNodes([$createLinkNode(href)]);
        selection.insertText(content);
        editor.dispatchCommand(TOGGLE_LINK_COMMAND, href);
      }
    });
    close();
  };

  return (
    <form onSubmit={onSubmit}>
      <InputField label="Text" type={"text"} onChange={(event) => setContent(event)} value={content} />
      <InputField label="Link" type={"text"} onChange={(event) => setHref(event)} value={href} />
      <Button type="submit">Submit</Button>
    </form>
  );
};
