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

import React, { FC } from "react";
import { useTranslation } from "react-i18next";
import { Repository } from "@scm-manager/ui-types";
import { SecondaryNavigationItem } from "@scm-manager/ui-components";
import { DocumentationDto } from "./DocumentationDto";

type Props = {
  repository: Repository;
};

const DocumentationViewerNavLink: FC<Props> = ({ repository }) => {
  const [t] = useTranslation("plugins");

  if (repository._embedded == undefined) {
    return null;
  }

  const dto = repository._embedded["documentationViewer"] as DocumentationDto;
  const documentationLink = concatenatePath(repository, dto);

  return (
    <SecondaryNavigationItem
      to={documentationLink}
      icon="fas fa-book-reader"
      label={t("scm-documentation-viewer-plugin.navLink")}
      title={t("scm-documentation-viewer-plugin.navLink")}
    />
  );
};

function concatenatePath(repository: Repository, dto: DocumentationDto): string {
  let path: string = "/repo/" + repository.namespace + "/" + repository.name + "/code/sources/" + dto.branchName;

  if (!dto.basePath.startsWith("/")) {
    path += "/";
  }

  path += dto.basePath;
  if (!path.endsWith("/")) {
    path += "/";
  }

  path += dto.landingPage;
  return path;
}

export default DocumentationViewerNavLink;
