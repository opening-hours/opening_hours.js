# Contributing to opening_hours

We're excited you're interested in contributing! This document outlines our contribution guidelines and processes.

## Branching Model

We use a branching model inspired by Gitflow:

* **`main`**: This branch represents the latest stable release. Direct commits to `main` are forbidden. Pull requests to `main` are only made from the `develop` branch when a new release is ready.
* **`develop`**: This is the primary development branch and default git branch. All new feature development and bug fixes should be based on this branch. Pull requests for new features or fixes should target the `develop` branch.

## Getting Started

1.  **Fork the repository**.
2.  **Clone your fork** locally: `git clone https://github.com/opening-hours/opening_hours.js`
3.  **Create a new branch** from `develop` for your work: `git switch -c feature/your-feature-name develop` or `git switch -c bugfix/issue-description develop`.
4.  **Make your changes** and commit them with clear, descriptive messages.
5.  **Push your branch** to your fork: `git push origin feature/your-feature-name`.
6.  **Open a Pull Request** (PR) against the `develop` branch of the [upstream repository][ohlib.github].

## Pull Request Process

1.  Ensure your PR includes a clear description of the changes and why they are being made. Reference any relevant issues.
2.  Your PR will be reviewed by a maintainer.
3.  Once approved and CI checks pass, your PR will be merged into the `develop` branch.

## Releasing

When the `develop` branch is deemed ready for a new release:

1.  A maintainer prepares the release in a `release/` branch based on `develop`.
2.  The maintainer updates school holiday data: `node scripts/fetch-school-holidays.mjs` and commits any changes.
3.  The maintainer runs `make release-prepare` locally.
4.  The maintainer decides if a release candidate should be released, if rc `npx commit-and-tag-version --prerelease=rc` should be run locally, if not `make release-local` should be run. In case a maintainer does not have a separate OpenSSH/OpenPGP key for releases, they can use their regular signing key. The maintainer pushes the signed git tag to their repo fork.
5.  This pull request will be reviewed and then merged into `develop`
6.  The maintainer creates a new pull request from `develop` to `main`.
7.  ypid who is currently the only one who can release to npmjs.com gets assigned the pull requests, pulls the signed git tag and runs `make release-publish` on their machine and finally merges the pull request.
8.  ypid creates a release on GitHub and marks it as latest.

## Translation Contributions

### Translating the evaluation tool and the map

The web-based evaluation tool and map use [i18next][i18next] for translation. Translations can be made in the file [js/i18n-resources.js][ohlib.js/i18n-resources.js]. Just copy the whole English block, change the language code to the one you are adding and make your translation. You can open the [index.html][site/index.html] to see the result of your work. Week and month names are translated by the browser using the `Date.toLocaleString` function.

Note that this resource file does also provide the localization for the [opening_hours_map]. This can also be tested by cloning the project and linking your modified opening_hours.js working copy to the opening_hours.js directory (after renaming it) inside the opening_hours_map project. Or just follow the installation instructions from the [opening_hours_map].

### Translating Error Messages and Warnings

The core library uses a custom lightweight i18n implementation. Translations for error messages and warnings can be made in the file [locales/opening_hours_resources.yaml][ohlib.js/locales/opening_hours_resources.yaml]. You are encouraged to test your translations. Checkout the [Makefile][ohlib.makefile] and the [test framework][ohlib.test.js] for how this can be done.

#### Word Error Correction System

The word error correction system is automatically generated using the `scripts/gen_word_error_correction.mjs` script, which creates corrections for date/time-related terms across 141+ languages using native internationalization API `Intl`. The system generates over 2,000 automatic corrections for common misspellings and variations of month names, weekday names, and other temporal terms.

Manual corrections can be added to `src/locales/word_error_correction_manual.yaml` for cases that require human curation or language-specific corrections that cannot be automatically generated. The build system automatically combines both automatic and manual corrections into the final `word_error_correction.yaml` file used by the library.

To regenerate the word error corrections:
```bash
make src/locales/word_error_correction.yaml
```

## Holiday Data Contributions

Please do not open issues for missing holidays. It is obvious that there are more missing holidays then holidays which are defined in this library. Instead consider if you can add your missing holidays and send me a pull request or patch. If you are hitting a problem because some holidays depend on variable days or something like this, consider opening a unfinished PR so that the more complicated things can be discussed there.

Holidays can be added to the file [index.js][ohlib.opening_hours.js]. Have a look at the current definitions for [other holidays][ohlib.holidays].

Please refer to the [holiday documentation][ohlib.docs.holiday] for more details about the data format.

Please consider adding a test (with a time range of one year for example) to see if everything works as expected and to ensure that it will stay that way.
See under [testing][ohlib.testing].

In case your holiday definition does only change the `holiday_definitions` variable (and not core code) it is also ok to test the definition using the `scripts/PH_SH_exporter.js` script. In that case writing a test is not required but still appreciated. Example: `./scripts/PH_SH_exporter.js --verbose --from=2016 --to=2016 --public-holidays --country dk --state dk /tmp/dk_holidays.txt`

## Core Code Contributions

### Testing

Be sure to add one or more tests if you add new features or enhance error tolerance or the like.
See under [testing][ohlib.testing].

### Commit Message Convention

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification. The minimum required format is:

```text
<type>[(optional scope)]: <subject>
```

Optionally with body and footer:

```text
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

**Commit Types:**

- `feat`: A new feature
- `fix`: A bug fix
- `data`: Updates to holiday/locale data files
- `docs`: Documentation only changes
- `style`: Code style changes (formatting, missing semicolons, etc.)
- `refactor`: Code changes that neither fix bugs nor add features
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `build`: Changes to build system or dependencies
- `ci`: Changes to CI configuration
- `chore`: Other changes that don't modify src or test files

**Scope (optional):**

The scope indicates the part of the codebase being changed. Common scopes include:

- `parser`: Parser/tokenizer changes
- `holidays`: Holiday definition logic (not data updates)
- `locales`: Translation/i18n changes
- `rollup`: rollup changes
- `npm`: npm changes
- `test`: Test infrastructure
- `deps`: Dependency updates
- `evaluation-tool`: Evaluation tool written in HTML, CSS, JS
- Country codes (`de`, `fr`, `us`, etc.): Country-specific changes

**Examples:**

```text
feat(parser): add support for week ranges with step

fix: resume periodic week schedules mid-range

data(holidays): update Argentina 2026 public holidays

data(de): update school holidays for Bavaria 2026

docs(readme): add installation instructions for Deno

build(rollup): migrate to ESM output format

test: add coverage for periodic week schedules
```

**Note:** The scope is optional. When in doubt, omit it rather than guessing.

The changelog is automatically generated from these commit messages. Only `feat`, `fix`, `data`, `docs`, and `refactor` commits appear in the changelog.

### Commit Hooks

Note that there is a git pre-commit hook used to run and compare the test framework before each commit. Hooks are written as shell scripts using [husky][husky] and should be installed to git automatically when running `npm install`. If this does not happen, you can manually run `node --run postinstall`.

## Reporting Issues

- **Bugs**: Open an issue with detailed reproduction steps
- **Enhancements**: Open an issue to discuss before starting implementation

### Documentation

All functions are documented, which should help contributors to get started.

The documentation looks like this:

```js
/* List parser for constrained weekdays in month range {{{
 * e.g. Su[-1] which selects the last Sunday of the month.
 *
 * :param tokens: List of token objects.
 * :param at: Position where to start.
 * :returns: Array:
 *            0. Constrained weekday number.
 *            1. Position at which the token does not belong to the list any more (after ']' token).
 */
function getConstrainedWeekday(tokens, at) {}
```

The opening brackets `{{{` (and the corresponding closing onces) are used to fold the source code. See [Vim folds][Vim folds].

---

Thank you for contributing!

[husky]: https://typicode.github.io/husky
[i18next]: https://www.i18next.com
[Vim folds]: https://vimhelp.org/fold.txt.html#folding

[opening_hours_map]: https://github.com/opening-hours/opening_hours_map
[ohlib.docs.holiday]: /holidays/README.md
[ohlib.holidays]: README.md#holidays
[ohlib.js/locales/opening_hours_resources.yaml]: src/locales/opening_hours_resources.yaml
[ohlib.js/i18n-resources.js]: site/js/i18n-resources.js
[ohlib.makefile]: /Makefile
[ohlib.opening_hours.js]: /index.js
[ohlib.test.js]: test/test.js
[ohlib.testing]: README.md#testing
[ohlib.github]: https://github.com/opening-hours/opening_hours.js
[site/index.html]: site/index.html
