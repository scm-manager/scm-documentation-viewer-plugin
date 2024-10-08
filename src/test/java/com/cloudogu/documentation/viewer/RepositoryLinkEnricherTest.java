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

import org.github.sdorra.jse.ShiroExtension;
import org.github.sdorra.jse.SubjectAware;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.Answers;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import sonia.scm.api.v2.resources.HalAppender;
import sonia.scm.api.v2.resources.HalEnricherContext;
import sonia.scm.repository.Branch;
import sonia.scm.repository.Branches;
import sonia.scm.repository.BrowserResult;
import sonia.scm.repository.FileObject;
import sonia.scm.repository.Person;
import sonia.scm.repository.Repository;
import sonia.scm.repository.RepositoryTestData;
import sonia.scm.repository.api.BranchesCommandBuilder;
import sonia.scm.repository.api.BrowseCommandBuilder;
import sonia.scm.repository.api.CatCommandBuilder;
import sonia.scm.repository.api.RepositoryService;
import sonia.scm.repository.api.RepositoryServiceFactory;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith({MockitoExtension.class, ShiroExtension.class})
class RepositoryLinkEnricherTest {

  private RepositoryLinkEnricher enricher;

  @Mock
  private HalAppender appender;

  private HalEnricherContext context;

  @Mock
  private RepositoryServiceFactory repositoryServiceFactory;
  @Mock
  private RepositoryService repositoryService;

  @Mock(answer = Answers.RETURNS_SELF)
  private BrowseCommandBuilder browseCommandBuilder;
  @Mock(answer = Answers.RETURNS_SELF)
  private BranchesCommandBuilder branchCommandBuilder;
  @Mock(answer = Answers.RETURNS_SELF)
  private CatCommandBuilder catCommandBuilder;

  @BeforeEach
  void init() {
    Repository repository = RepositoryTestData.createHeartOfGold();
    repository.setNamespace("namespace");
    repository.setName("name");
    repository.setId("1");


    HalEnricherContext.Builder builder = HalEnricherContext.builder();
    builder.put(Repository.class, repository);
    context = builder.build();

    enricher = new RepositoryLinkEnricher(repositoryServiceFactory);

    lenient().when(repositoryServiceFactory.create(repository)).thenReturn(repositoryService);
    lenient().when(repositoryService.getBrowseCommand()).thenReturn(browseCommandBuilder);
    lenient().when(repositoryService.getCatCommand()).thenReturn(catCommandBuilder);
  }

  @Nested
  class Enrich {

    @Test
    @SubjectAware("Professor Oak")
    void shouldNotAppendWithMissingRepositoryReadPermission() {
      enricher.enrich(context, appender);
      verifyNoInteractions(appender);
    }

    @Test
    @SubjectAware(value = "Professor Oak", permissions = "repository:read:1")
    void shouldNotAppendWithMissingDocumentationYaml() throws IOException {
      createDocumentationConfig(List.of());
      enricher.enrich(context, appender);
      verifyNoInteractions(appender);
    }

    @Test
    @SubjectAware(value = "Professor Oak", permissions = "repository:read:1")
    void shouldNotAppendWithInvalidYamlSyntax() throws IOException {
      createDocumentationConfig(
        List.of(
          new ChildrenFiles("{'prop':'definitely not yaml'}", "documentation.yaml")
        )
      );
      enricher.enrich(context, appender);
      verifyNoInteractions(appender);
    }

    @Test
    @SubjectAware(value = "Professor Oak", permissions = "repository:read:1")
    void shouldNotAppendWithOnlyInvalidYamlProperties() throws IOException {
      String documentationYamlContent = """
        wrongProp: "wrong"
        anotherInvalidProp: "invalid"
        """;

      createDocumentationConfig(
        List.of(
          new ChildrenFiles(documentationYamlContent, "documentation.yaml")
        )
      );

      enricher.enrich(context, appender);
      verifyNoInteractions(appender);
    }

    @Test
    @SubjectAware(value = "Professor Oak", permissions = "repository:read:1")
    void shouldNotAppendWithAdditionalInvalidYamlProperties() throws IOException {
      String documentationYamlContent =
        """
          basePath: "/docs"
          landingPage: "home.md"
          invalidProp: 42
          """;
      createDocumentationConfig(
        List.of(
          new ChildrenFiles(documentationYamlContent, "documentation.yaml")
        )
      );

      enricher.enrich(context, appender);
      verifyNoInteractions(appender);
    }

    @ParameterizedTest
    @ValueSource(strings = {"//d", "/../docs", "../docs", "/docs/../../root", ""})
    @SubjectAware(value = "Professor Oak", permissions = "repository:read:1")
    void shouldNotAppendBecauseBasePathFromYamlIsInvalidFilePath(String basePath) throws IOException {
      String documentationYamlContent = String.format("""
        basePath: "%s"
        landingPage: "home.md"
        """, basePath);

      createDocumentationConfig(
        List.of(
          new ChildrenFiles(documentationYamlContent, "documentation.yaml")
        )
      );
      createBranches();

      enricher.enrich(context, appender);
      verifyNoInteractions(appender);
    }

    @ParameterizedTest
    @ValueSource(strings = {"home", "/home.md", "home.md/", "ho/me.md", "home:md", "home.txt", ""})
    @SubjectAware(value = "Professor Oak", permissions = "repository:read:1")
    void shouldNotAppendBecauseLandingPageFromYamlIsInvalidFileName(String landingPage) throws IOException {
      String documentationYamlContent = String.format("""
        basePath: "/docs"
        landingPage: "%s"
        """, landingPage);

      createDocumentationConfig(
        List.of(
          new ChildrenFiles(documentationYamlContent, "documentation.yaml")
        )
      );
      createBranches();

      enricher.enrich(context, appender);
      verifyNoInteractions(appender);
    }

    @ParameterizedTest
    @ValueSource(strings = {"yaml", "yml"})
    @SubjectAware(value = "Professor Oak", permissions = "repository:read:1")
    void shouldAppendWithConfig(String fileExtension) throws IOException {
      String documentationYamlContent = """
        basePath: "/d"
        landingPage: "index.md"
        """;

      createDocumentationConfig(
        List.of(
          new ChildrenFiles(documentationYamlContent, "documentation." + fileExtension)
        )
      );

      createBranches();
      enricher.enrich(context, appender);

      verify(appender).appendEmbedded(
        "documentationViewer",
        createDto("/d", "index.md")
      );
    }

    @Test
    @SubjectAware(value = "Professor Oak", permissions = "repository:read:1")
    void shouldNotAppendWithMissingBranch() throws IOException {
      String documentationYamlContent = """
        basePath: "/d"
        landingPage: "index.md"
        """;

      createDocumentationConfig(
        List.of(
          new ChildrenFiles(documentationYamlContent, "documentation.yaml")
        )
      );
      List<Branch> branchList = new ArrayList<>();
      Branches branches = new Branches();
      branches.setBranches(branchList);
      lenient().when(repositoryService.getBranchesCommand()).thenReturn(branchCommandBuilder);
      lenient().when(repositoryService.getBranchesCommand().getBranches()).thenReturn(branches);
      enricher.enrich(context, appender);

      verifyNoInteractions(appender);
    }


    @Test
    @SubjectAware(value = "Professor Oak", permissions = "repository:read:1")
    void shouldNotAppendBecauseBothYamlAndYmlExist() throws IOException {
      String documentationYamlContent = """
        basePath: "/d"
        landingPage: "index.md"
        """;

      createDocumentationConfig(
        List.of(
          new ChildrenFiles(documentationYamlContent, "documentation.yaml"),
          new ChildrenFiles(documentationYamlContent, "documentation.yml")
        )
      );

      createBranches();

      enricher.enrich(context, appender);

      verifyNoInteractions(appender);
    }

    @Test
    @SubjectAware(value = "Professor Oak", permissions = "repository:read:1")
    void shouldAppendWithDefaultsBecauseYamlIsEmpty() throws IOException {
      createDocumentationConfig(
        List.of(
          new ChildrenFiles("", "documentation.yaml")
        )
      );

      createBranches();

      enricher.enrich(context, appender);
      verify(appender).appendEmbedded(
        "documentationViewer",
        createDto("docs", "home.md")
      );
    }


    @Test
    @SubjectAware(value = "Professor Oak", permissions = "repository:read:1")
    void shouldAppendWithDefaultBasePath() throws IOException {
      String documentationYamlContent = """
        landingPage: "index.md"
        """;

      createDocumentationConfig(
        List.of(
          new ChildrenFiles(documentationYamlContent, "documentation.yaml")
        )
      );

      createBranches();
      enricher.enrich(context, appender);
      verify(appender).appendEmbedded(
        "documentationViewer",
        createDto("docs", "index.md")
      );
    }

    @Test
    @SubjectAware(value = "Professor Oak", permissions = "repository:read:1")
    void shouldAppendWithBasePathFromYamlAndDefaultLandingPage() throws IOException {
      String documentationYamlContent = """
        basePath: "/d"
        """;

      createDocumentationConfig(
        List.of(
          new ChildrenFiles(documentationYamlContent, "documentation.yaml")
        )
      );

      createBranches();
      enricher.enrich(context, appender);
      verify(appender).appendEmbedded(
        "documentationViewer",
        createDto("d", "home.md")
      );
    }

    private void createDocumentationConfig(List<ChildrenFiles> childrenFiles) throws IOException {
      FileObject root = new FileObject();
      root.setPath("");
      root.setName("");
      root.setDirectory(true);
      root.setChildren(childrenFiles.stream().map(childrenFile -> {
          FileObject child = new FileObject();
          child.setPath(childrenFile.filename());
          child.setName(childrenFile.filename());
          return child;
        }
      ).toList());

      BrowserResult browserResult = new BrowserResult("develop", root);
      when(browseCommandBuilder.getBrowserResult()).thenReturn(browserResult);

      for (ChildrenFiles childrenFile : childrenFiles) {
        lenient().when(catCommandBuilder.getContent(childrenFile.filename())).thenReturn(childrenFile.content());
      }
    }

    private void createBranches() throws IOException {
      List<Branch> branchList = new ArrayList<>();
      branchList.add(Branch.normalBranch("feature", "test", 0L, new Person("Ash")));
      branchList.add(Branch.defaultBranch("develop", "test", 0L, new Person("Ash")));
      Branches branches = new Branches();
      branches.setBranches(branchList);

      lenient().when(repositoryService.getBranchesCommand()).thenReturn(branchCommandBuilder);
      lenient().when(repositoryService.getBranchesCommand().getBranches()).thenReturn(branches);
    }

    private DocumentationSettingsDto createDto(String basePath, String landingPage) {
      return new DocumentationSettingsDto("develop", basePath, landingPage);
    }
  }

  record ChildrenFiles(String content, String filename) {
  }
}
