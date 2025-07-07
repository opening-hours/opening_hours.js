# Contributing to opening_hours

We're excited you're interested in contributing! This document outlines our contribution guidelines and processes.

## Branching Model

We use a branching model inspired by Gitflow:

* **`main`**: This branch represents the latest stable release. Direct commits to `main` are forbidden. Pull requests to `main` are only made from the `develop` branch when a new release is ready.
* **`develop`**: This is the main development branch. All new feature development and bug fixes should be based on this branch. Pull requests for new features or fixes should target the `develop` branch.

## Getting Started

1.  **Fork the repository**.
2.  **Clone your fork** locally: `git clone https://github.com/opening-hours/opening_hours.js`
3.  **Create a new branch** from `develop` for your work: `git switch -c feature/your-feature-name develop` or `git switch -c bugfix/issue-description develop`.
4.  **Make your changes** and commit them with clear, descriptive messages.
5.  **Push your branch** to your fork: `git push origin feature/your-feature-name`.
6.  **Open a Pull Request** (PR) against the `develop` branch of the main repository.

## Pull Request Process

1.  Ensure your PR includes a clear description of the changes and why they are being made. Reference any relevant issues.
2.  Your PR will be reviewed by a maintainer.
3.  Once approved and CI checks pass, your PR will be merged into the `develop` branch.

## Releasing

When the `develop` branch is deemed ready for a new release:

1.  A maintainer will create a pull request from `develop` to `main`.
2.  This pull request will be reviewed.
3.  Upon approval, the `develop` branch will be merged into `main`.
4.  A new release tag will be created on the `main` branch.

## Translation Contributions

This project uses [i18next][i18next] for translation.

### Translating the evaluation tool and the map

Translations can be made in the file [js/i18n-resources.js][ohlib.js/i18n-resources.js]. Just copy the whole English block, change the language code to the one you are adding and make your translation. You can open the [index.html][site/index.html] to see the result of your work. Week and month names are translated by the browser using the `Date.toLocaleString` function.

Note that this resource file does also provide the localization for the [opening_hours_map]. This can also be tested by cloning the project and linking your modified opening_hours.js working copy to the opening_hours.js directory (after renaming it) inside the opening_hours_map project. Or just follow the installation instructions from the [opening_hours_map].

### Translating Error Messages and Warnings

Translations for error messages and warnings for the opening_hours.js library can be made in the file [locales/opening_hours_resources.yaml][ohlib.js/locales/opening_hours_resources.yaml]. You are encouraged to test your translations. Checkout the [Makefile][ohlib.makefile] and the [test framework][ohlib.test.js] for how this can be done.

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

[ohlib.opening_hours.js]: /index.js
[ohlib.js/locales/opening_hours_resources.yaml]: src/locales/opening_hours_resources.yaml
[ohlib.js/i18n-resources.js]: site/js/i18n-resources.js
[site/index.html]: site/index.html
[ohlib.test.js]: test/test.js
[ohlib.testing]: README.md#testing
