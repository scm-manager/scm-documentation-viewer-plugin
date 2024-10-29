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

import React, { FC, MutableRefObject } from "react";
import { MarkdownEditor, useMarkdownEditor } from "./MarkdownEditor";

type Props = {
  content?: string;
  disabled?: boolean;
  className?: string;
  onChange: (value: string) => void;
  ref?: MutableRefObject<any>;
};

export const DocumentationEditor: FC<Props> = ({ content, onChange, disabled }) => {
  const editorInstance = useMarkdownEditor({
    onChange: async (event) => {
      onChange(await event.getMarkdownString());
    },
  });

  if (disabled) {
    return <></>;
  }

  return (
    <>
      <MarkdownEditor initialContent={content || ""} editorInstance={editorInstance} />
    </>
  );
};
