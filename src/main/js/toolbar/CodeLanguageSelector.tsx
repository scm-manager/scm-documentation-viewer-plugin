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

import React, { FC, useCallback, useEffect, useState } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getSelection, $isRangeSelection } from "lexical";
import { $findMatchingParent } from "@lexical/utils";
import { $isCodeNode } from "@lexical/code";
import styled from "styled-components";
import { Select } from "@scm-manager/ui-components";

// @ts-expect-error
const LangSelect = styled(Select)`
  :focus {
    z-index: 100;
  }

  :hover {
    color: var(--scm-info-color);
  }
`;

const codeLanguages: Record<string, string> = {
  text: "Text",
  js: "JavaScript",
  java: "Java",
  ts: "TypeScript",
  go: "GoLang",
};

const languageSelectItems = Object.keys(codeLanguages).map((lang) => {
  return {
    value: lang,
    label: codeLanguages[lang],
  };
});

type Props = {
  selected?: string;
  disabled?: boolean;
};

const CodeLanguageSelector: FC<Props> = ({ disabled, selected = "text" }) => {
  const [language, setLanguage] = useState(selected);
  const [editor] = useLexicalComposerContext();

  const $getCodeNode = useCallback(() => {
    const selection = $getSelection();

    if ($isRangeSelection(selection)) {
      const anchor = selection.anchor.getNode();
      return $findMatchingParent(anchor, $isCodeNode);
    }
  }, [editor]);

  useEffect(() => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const codeNode = $getCodeNode();
        if (codeNode) {
          const lang = codeNode.getLanguage();
          if (lang) {
            setLanguage(lang);
          }
        }
      }
    });
  });

  useEffect(() => {
    setLanguage(selected);
  }, [selected]);

  const changeLanguage = (event: string) => {
    editor.update(() => {
      const codeNode = $getCodeNode();
      if (codeNode) {
        codeNode.setLanguage(event);
        setLanguage(event);
      }
    });
  };

  return <LangSelect disabled={disabled} options={languageSelectItems} value={language} onChange={changeLanguage} />;
};

export default CodeLanguageSelector;
