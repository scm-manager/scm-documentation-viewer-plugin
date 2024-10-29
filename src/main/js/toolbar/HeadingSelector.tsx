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

import React, { useEffect, useState } from "react";
import { $getSelection, $isRangeSelection, ElementNode } from "lexical";
import { $setBlocksType } from "@lexical/selection";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $createHeadingNode } from "@lexical/rich-text";
import styled from "styled-components";
import { useTranslation } from "react-i18next";

const DropdownButton = styled.button<{ isActive: boolean }>`
  border-radius: 0;

  :focus {
    z-index: 100;
  }

  :hover {
    color: var(--scm-info-color);
  }

  ${({ isActive }) =>
    isActive &&
    `
    border-color: transparent;
    background-color: var(--scm-info-color);
    color: var(--scm-white-color);
    
    :hover {
      color: var(--scm-secondary-background);
    }
  `}
`;

type HeadingSelectorProps = {
  activeBlock: string;
};

export const HeadingSelector = ({ activeBlock }: HeadingSelectorProps) => {
  const [isOpen, setOpen] = useState(false);
  const [editor] = useLexicalComposerContext();
  const [headingSize, setHeadingSize] = useState("1");
  const [isActive, setIsActive] = useState(false);

  const handleOpen = () => {
    setOpen(!isOpen);
  };

  useEffect(() => {
    if (
      activeBlock === "h1" ||
      activeBlock === "h2" ||
      activeBlock === "h3" ||
      activeBlock === "h4" ||
      activeBlock === "h5" ||
      activeBlock === "h6"
    ) {
      setHeadingSize(activeBlock.charAt(1));
      setIsActive(true);
    } else {
      setHeadingSize("1");
      setIsActive(false);
    }
  }, [activeBlock]);

  const createBlockFormatter = (createElement: () => ElementNode) => {
    return () => {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          $setBlocksType(selection, createElement);
          setOpen(false);
        }
      });
    };
  };

  return (
    <div className={"dropdown" + (isOpen ? " is-active" : "")}>
      <div className={"dropdown-trigger"}>
        <DropdownButton
          isActive={isActive}
          onClick={handleOpen}
          className="button"
          aria-haspopup="true"
          aria-controls="dropdown-menu3"
        >
          <span className="icon is-small">
            <i className="fas fa-heading" aria-hidden="true"></i>
          </span>
          <span>{headingSize}</span>
          <span className="icon is-small">
            <i className="fas fa-angle-down" aria-hidden="true"></i>
          </span>
        </DropdownButton>
      </div>
      <div className="dropdown-menu" id="dropdown-menu3" role="menu">
        <div className="dropdown-content">
          <HeadingItem
            heading={1}
            activeBlock={activeBlock}
            onClick={createBlockFormatter(() => $createHeadingNode("h1"))}
          />
          <HeadingItem
            heading={2}
            activeBlock={activeBlock}
            onClick={createBlockFormatter(() => $createHeadingNode("h2"))}
          />
          <HeadingItem
            heading={3}
            activeBlock={activeBlock}
            onClick={createBlockFormatter(() => $createHeadingNode("h3"))}
          />
          <HeadingItem
            heading={4}
            activeBlock={activeBlock}
            onClick={createBlockFormatter(() => $createHeadingNode("h4"))}
          />
          <HeadingItem
            heading={5}
            activeBlock={activeBlock}
            onClick={createBlockFormatter(() => $createHeadingNode("h5"))}
          />
          <HeadingItem
            heading={6}
            activeBlock={activeBlock}
            onClick={createBlockFormatter(() => $createHeadingNode("h6"))}
          />
        </div>
      </div>
    </div>
  );
};

type HeadingItemProps = {
  heading: number;
  onClick: () => void;
  activeBlock: string;
};

const HeadingItem = ({ heading, onClick, activeBlock }: HeadingItemProps) => {
  const [t] = useTranslation("plugins");

  return (
    <a className={"dropdown-item"} onClick={onClick}>
      <div className={"is-flex is-align-content-center"}>
        <div className={"title m-0 is-" + (heading + 1)}>
          {t("scm-documentation-viewer-plugin.editor.heading", { value: heading })}
        </div>
        {activeBlock === "h" + heading && (
          <span className="icon is-small is-flex is-align-content-center">
            <i className="fas fa-check" aria-hidden="true"></i>
          </span>
        )}
      </div>
    </a>
  );
};
