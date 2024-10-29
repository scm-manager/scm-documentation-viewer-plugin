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

import styled from "styled-components";
import { Button, Icon } from "@scm-manager/ui-buttons";
import React, { ReactElement } from "react";

export const Toolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  border-bottom: 1px solid var(--scm-border-color);
  margin-left: 0.5rem;
`;

const StyledButton = styled(Button)<{ isActive: boolean }>`
  border-radius: 0;
  min-width: 2.5rem;
  height: 2.5rem;
  padding: 0.5em;

  :focus {
    z-index: 100;
  }
  ${({ isActive }) =>
    isActive &&
    `
    border-color: transparent;
    background-color: var(--scm-info-color);
  `}

  ${({ isFirst }) =>
    isFirst &&
    `
    border-top-left-radius: 5px;
    border-bottom-left-radius: 5px;
  `}
  ${({ isLast }) =>
    isLast &&
    `
    border-top-right-radius: 5px;
    border-bottom-right-radius: 5px;
  `}
    ${({ isSingle }) =>
    isSingle &&
    `
    border-radius: 5px;
  `};
`;

const StyledIcon = styled(Icon)<{ isActive: boolean }>`
  ${({ isActive }) =>
    isActive &&
    `
    color: var(--scm-white-color);
  `}

  :hover {
    color: var(--scm-info-color);
  }
`;

type ToolbarButtonProps = {
  isActive: boolean;
  onClick: () => void;
  icon: string;
};

export const ToolbarButton = ({ isActive, onClick, icon, ...props }: ToolbarButtonProps) => {
  return (
    <StyledButton isActive={isActive} onClick={onClick} {...props}>
      <StyledIcon isActive={isActive}>{icon}</StyledIcon>
    </StyledButton>
  );
};

type ToolbarButtonGroupProps = {
  children: ReactElement[] | ReactElement;
};

export const ToolbarButtonGroup = ({ children }: ToolbarButtonGroupProps) => {
  const buttons = React.Children.toArray(children);

  return (
    <div className={"is-flex is-flex-wrap mx-2"}>
      {buttons.map((button, index) => {
        const isFirst = index === 0;
        const isLast = index === buttons.length - 1;
        const isSingle = buttons.length === 1;

        return React.cloneElement(button, { isFirst, isLast, isSingle });
      })}
    </div>
  );
};
