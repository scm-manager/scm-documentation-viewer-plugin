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

package com.cloudogu.documentation.viewer;

import jakarta.inject.Inject;
import lombok.extern.slf4j.Slf4j;
import org.yaml.snakeyaml.LoaderOptions;
import org.yaml.snakeyaml.Yaml;
import org.yaml.snakeyaml.constructor.Constructor;
import org.yaml.snakeyaml.error.YAMLException;
import sonia.scm.api.v2.resources.Enrich;
import sonia.scm.api.v2.resources.HalAppender;
import sonia.scm.api.v2.resources.HalEnricher;
import sonia.scm.api.v2.resources.HalEnricherContext;
import sonia.scm.plugin.Extension;
import sonia.scm.repository.Branch;
import sonia.scm.repository.BrowserResult;
import sonia.scm.repository.FileObject;
import sonia.scm.repository.Repository;
import sonia.scm.repository.RepositoryPermissions;
import sonia.scm.repository.api.RepositoryService;
import sonia.scm.repository.api.RepositoryServiceFactory;
import sonia.scm.util.ValidationUtil;

import java.io.IOException;
import java.util.Optional;

@Slf4j
@Extension
@Enrich(Repository.class)
public class RepositoryLinkEnricher implements HalEnricher {

  private final RepositoryServiceFactory repositoryServiceFactory;
  private final Yaml yaml = new Yaml(new Constructor(DocumentationSettings.class, new LoaderOptions()));


  @Inject
  public RepositoryLinkEnricher(RepositoryServiceFactory repositoryServiceFactory) {
    this.repositoryServiceFactory = repositoryServiceFactory;
  }

  @Override
  public void enrich(HalEnricherContext halEnricherContext, HalAppender halAppender) {
    Repository repository = halEnricherContext.oneRequireByType(Repository.class);
    if (!RepositoryPermissions.read(repository).isPermitted()) {
      return;
    }

    try (RepositoryService repositoryService = repositoryServiceFactory.create(repository)) {
      DocumentationYamlExists documentationYamlExists = isDocumentationYamlExisting(repositoryService);
      boolean yamlDocumentationFileExists = documentationYamlExists.yamlFileExists;
      boolean ymlDocumentationFileExists = documentationYamlExists.ymlFileExists;

      if (yamlDocumentationFileExists && ymlDocumentationFileExists) {
        log.warn("documentation.yml and documentation.yaml was not found in repository {}", repository);
        return;
      }

      if (!yamlDocumentationFileExists && !ymlDocumentationFileExists) {
        log.warn("documentation.yml and documentation.yaml was found in repository {}, but only one should exist", repository);
        return;
      }

      String extension = yamlDocumentationFileExists ? "yaml" : "yml";
      String settingsYaml = repositoryService.getCatCommand().getContent("documentation." + extension);

      Optional<DocumentationSettings> expectedSettings = Optional.ofNullable(yaml.load(settingsYaml));
      DocumentationSettings settings = expectedSettings.orElseGet(DocumentationSettings::new);
      Optional<Branch> defaultBranch = repositoryService
        .getBranchesCommand()
        .getBranches()
        .getBranches()
        .stream()
        .filter(Branch::isDefaultBranch)
        .findFirst();

      if (defaultBranch.isEmpty()) {
        log.trace("Default branch not found in repository {}", repository);
        return;
      }

      if (!isSettingsValid(settings, repository)) {
        return;
      }

      DocumentationSettingsDto doc = new DocumentationSettingsDto(
        defaultBranch.get().getName(), settings.getBasePath(), settings.getLandingPage()
      );
      halAppender.appendEmbedded("documentationViewer", doc);
    } catch (IOException e) {
      log.warn("Documentation enrichment failed for repository {}", repository, e);
    } catch (YAMLException e) {
      log.warn("documentation.yaml or documentation.yml file of repository {} could not get parsed", repository, e);
    }
  }

  private boolean isSettingsValid(DocumentationSettings settings, Repository repository) {
    if (settings.getBasePath().isEmpty()) {
      log.trace("documentation base path is empty for repository {}", repository);
      return false;
    }

    if (!ValidationUtil.isPathValid(settings.getBasePath())) {
      log.trace("documentation base path is not a valid path '{}' for repository {}", settings.getBasePath(), repository);
      return false;
    }

    if (settings.getLandingPage().isEmpty()) {
      log.trace("documentation landing page is empty for repository {}", repository);
      return false;
    }

    if (!ValidationUtil.isFilenameValid(settings.getLandingPage()) || !settings.getLandingPage().endsWith(".md")) {
      log.trace("documentation landing page is not a valid file name '{}' for repository {}", settings.getLandingPage(), repository);
      return false;
    }

    return true;
  }

  private DocumentationYamlExists isDocumentationYamlExisting(RepositoryService repositoryService) throws IOException {
    BrowserResult browserResult = repositoryService
      .getBrowseCommand()
      .setPath("")
      .getBrowserResult();

    boolean yamlFileExists = false;
    boolean ymlFileExists = false;

    for (FileObject fileObject : browserResult.getFile().getChildren()) {
      if (fileObject.getName().equals("documentation.yaml")) {
        yamlFileExists = true;
      }

      if (fileObject.getName().equals("documentation.yml")) {
        ymlFileExists = true;
      }
    }

    return new DocumentationYamlExists(yamlFileExists, ymlFileExists);
  }

  private record DocumentationYamlExists(boolean yamlFileExists, boolean ymlFileExists) {
  }
}
