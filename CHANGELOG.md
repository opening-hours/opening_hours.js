<!--
SPDX-FileCopyrightText: © 2016 Robin Schneider <ypid@riseup.net>

SPDX-License-Identifier: LGPL-3.0-only
-->

# Changelog

All notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

## [3.13.0](https://github.com/opening-hours/opening_hours.js/compare/v3.12.0...v3.13.0) (2026-06-06)


### Features

* add *:conditional to osm_tag_defaults, suppress PH warning ([5196db1](https://github.com/opening-hours/opening_hours.js/commit/5196db1a9a25e39989b97fd662e3b306630f4a2f)), closes [#480](https://github.com/opening-hours/opening_hours.js/issues/480)
* **holidays:** support shift_rule for transferable public holidays ([73287f4](https://github.com/opening-hours/opening_hours.js/commit/73287f4f13d0b1df963b0daaef86d671c1e691e6)), closes [#455](https://github.com/opening-hours/opening_hours.js/issues/455)


### Bug Fixes

* **api:** ignore comment-only next-change boundaries ([5a9565b](https://github.com/opening-hours/opening_hours.js/commit/5a9565ba55a919a06b20015028e150d5d72156c0)), closes [#489](https://github.com/opening-hours/opening_hours.js/issues/489) [#523](https://github.com/opening-hours/opening_hours.js/issues/523)
* complete hyphen correction for U+2010–U+2012 ([00c2ee4](https://github.com/opening-hours/opening_hours.js/commit/00c2ee420646dd67a5f5e5c113a10b55bb152fdd))
* don't crash in formatWarnErrorMessage with Additional Rules ([658b230](https://github.com/opening-hours/opening_hours.js/commit/658b2303f4f3b9da595d1c0ac1c5aca26a835181))
* **evaluation-tool:** align table bars with labels on DST transition days ([765cfae](https://github.com/opening-hours/opening_hours.js/commit/765cfae3dc6ccf6de39532db980d71ae5ff8b49f)), closes [#575](https://github.com/opening-hours/opening_hours.js/issues/575)
* **evaluation-tool:** correct ISO week labels at year boundary ([db49bc7](https://github.com/opening-hours/opening_hours.js/commit/db49bc744c02108c0633a903f359333c25871c17)), closes [#567](https://github.com/opening-hours/opening_hours.js/issues/567)
* **evaluation-tool:** update i18next import path for v24+ ([a9d20ee](https://github.com/opening-hours/opening_hours.js/commit/a9d20ee1a1452b6d4d8b14b20e519788bdd4ef5f))
* interpret other non-standard hyphens as hyphen for ranges ([9829b16](https://github.com/opening-hours/opening_hours.js/commit/9829b16b22b956eacbca473ec9761633dc74c2bb))
* **parser:** don't match when nth weekday overflows to next month ([36d5404](https://github.com/opening-hours/opening_hours.js/commit/36d5404f7df796ec98929f8b39a42f2ed8ecb149)), closes [#444](https://github.com/opening-hours/opening_hours.js/issues/444)
* prevent TypeError in getWarnings() for unknown tag_key ([f38bdbf](https://github.com/opening-hours/opening_hours.js/commit/f38bdbfd3beef37d0f7eec9d2fc8505bff3b9766))


### Data Updates

* add holiday data for multiple countries ([f9674a9](https://github.com/opening-hours/opening_hours.js/commit/f9674a98c540f37bbcf8b1dd5fea95e4eeac53e5))
* add nominatim URLs for ca, nl, si, and ua ([a1d1bc0](https://github.com/opening-hours/opening_hours.js/commit/a1d1bc007e6973db23a1134a6b8e9b808a858989))
* **ar:** align with official and date-holidays data ([617d403](https://github.com/opening-hours/opening_hours.js/commit/617d403ded1505cf84f04e8f2ef941e4ea9c3dfd))
* **ar:** apply shift_rule for Ley 27.399 transferable holidays ([6206845](https://github.com/opening-hours/opening_hours.js/commit/6206845260ffd1f20c222923644f39db1ae4829d))
* **at:** update name ([c24b305](https://github.com/opening-hours/opening_hours.js/commit/c24b305b4cba7e4cf5bd1b0280380e74c66d1199))
* **au:** align with official and date-holidays data ([e48d3e2](https://github.com/opening-hours/opening_hours.js/commit/e48d3e28291c655803b6ffeba8af0b34c07b86c2))
* **au:** update name ([c638f67](https://github.com/opening-hours/opening_hours.js/commit/c638f6706275a41b5291d7fd4410243bb739b567))
* **be:** align names with official NL/FR terminology ([c63e05d](https://github.com/opening-hours/opening_hours.js/commit/c63e05d430ae36a1897190702503d831ee825002))
* **cz:** update name and remove old URL ([fabf1d3](https://github.com/opening-hours/opening_hours.js/commit/fabf1d319ce8429db7bbf8013936ca8057517cc6))
* **de:** update name ([576f8bc](https://github.com/opening-hours/opening_hours.js/commit/576f8bc02b01e87611c2b0bba3b130a83542850b))
* **dk:** update names and remove Store Bededag ([ff49f41](https://github.com/opening-hours/opening_hours.js/commit/ff49f4193adc367bab94731bc7abd84647c94c8a))
* **gr:** update names ([1bc8704](https://github.com/opening-hours/opening_hours.js/commit/1bc8704494ca7f29aaa15bee5c2d66113c230cee))
* **hr:** update names and add two holidays ([66440ae](https://github.com/opening-hours/opening_hours.js/commit/66440ae6fa59605e6a7b7db32bb4af493f0b8fda))
* **ie:** update names ([5b48c10](https://github.com/opening-hours/opening_hours.js/commit/5b48c1032580277fefcf991f1cee35ff3eeec21e))
* **je:** add Jersey PH baseline ([2e9cc57](https://github.com/opening-hours/opening_hours.js/commit/2e9cc57bc39972d8ae89609a218188d0e99e3f32))
* **je:** refresh Jersey generated data ([75e6c7a](https://github.com/opening-hours/opening_hours.js/commit/75e6c7a57ac2c7d00309c38370f9f58ef190da8b))
* **jp:** fix Sports Day to 2nd Monday of October ([6967cf4](https://github.com/opening-hours/opening_hours.js/commit/6967cf4bd17c8a2229bc4880866a3b18c817289f))
* **locales:** regenerate word error correction data with Node 26 ([e993e77](https://github.com/opening-hours/opening_hours.js/commit/e993e77fbca89c7696ee131e1738c4aa376eac1a))
* **na:** correct spelling of 'Workers’ Day' ([4f75770](https://github.com/opening-hours/opening_hours.js/commit/4f75770e37343729a9e2d26bf542b7bec5cab648))
* **no:** fix holiday names per Helligdagsfredloven ([e8954e8](https://github.com/opening-hours/opening_hours.js/commit/e8954e807f6176e7af45183c5357736053d346cb))
* **nz:** update name ([1e4a25e](https://github.com/opening-hours/opening_hours.js/commit/1e4a25e95234e7fbe4a9b2e3c9ee405fb97c0766))
* **pl:** fix holiday names per ustawa o dniach wolnych od pracy ([5b8eb24](https://github.com/opening-hours/opening_hours.js/commit/5b8eb241afb0abd206ab5b4837dd393e63184597))
* **ro:** add missing holidays and standardize per Wikipedia ([3d32cfc](https://github.com/opening-hours/opening_hours.js/commit/3d32cfc44fe8011ed380aff37cfcb64e3ca29751))
* **sk:** remove holidays no longer non-working days ([346e739](https://github.com/opening-hours/opening_hours.js/commit/346e73934903548209e5508bed5ae93d16c26267))
* **ua:** update holidays per current law ([e3f6793](https://github.com/opening-hours/opening_hours.js/commit/e3f679304f89e4e1e7d608fb63f3ba15440b15a3))
* update generated file ([0cad542](https://github.com/opening-hours/opening_hours.js/commit/0cad5422a8546f412813767ce0cfc591240216e0))


### Documentation

* add Rust implementation link to README ([fbe7c8f](https://github.com/opening-hours/opening_hours.js/commit/fbe7c8f83717c42750784dffe244b55d26541bca))
* fix and optimize links ([f0a045d](https://github.com/opening-hours/opening_hours.js/commit/f0a045d8be435728e2c7c9b1ce850830adc3e29f))
* **holidays:** document shift_rule ([4db9c13](https://github.com/opening-hours/opening_hours.js/commit/4db9c1383d91dbcd0fefada21dc3fa67b7981f78))


### Code Refactoring

* **evaluation-tool:** simplify theme toggle button initialization ([b194abc](https://github.com/opening-hours/opening_hours.js/commit/b194abc787bdab69308f6ab630d6be9378a38928))
* **evaluation-tool:** use toLocaleString in formatHM ([3777fdf](https://github.com/opening-hours/opening_hours.js/commit/3777fdfe26eafe5fbaeed8afb67c685faeae332e))
* remove unnecessary initializations for variables ([312e545](https://github.com/opening-hours/opening_hours.js/commit/312e5451f76d83ab872c21d7a6eb80c3a5b69ca4))
* remove unused getReadableState function from OpeningHoursTable ([9a923d3](https://github.com/opening-hours/opening_hours.js/commit/9a923d3bcbaf5021df9072298ee485ed2b31209a))

## [3.12.0](https://github.com/opening-hours/opening_hours.js/compare/v3.11.0...v3.12.0) (2026-03-21)


### Features

* add error tolerance tests for languages with Unicode characters and ambiguous words ([3f9fe33](https://github.com/opening-hours/opening_hours.js/commit/3f9fe33ba5a613959b13b34942434f27a93cd0b3))
* also use short names for weeks and months ([44d059a](https://github.com/opening-hours/opening_hours.js/commit/44d059a9bf7d9d69a66c6c64a398fc4e400c12c7))
* expand locale pattern discovery to 3-letter codes ([032c18a](https://github.com/opening-hours/opening_hours.js/commit/032c18a779dc7a06254409413bd74dde2edbec78))
* implement dynamic word error correction generator with zero dependencies ([361ca2d](https://github.com/opening-hours/opening_hours.js/commit/361ca2d4e5a5ccb408be32d7168bc832cb5ab891))


### Documentation

* rename develop branch to main (overwrites main) ([5cde3f5](https://github.com/opening-hours/opening_hours.js/commit/5cde3f57cc18898ef0ad995fcd4126d709c1b86a)), closes [#554](https://github.com/opening-hours/opening_hours.js/issues/554)
* update localization documentation to include word error correction system details ([957cc5c](https://github.com/opening-hours/opening_hours.js/commit/957cc5cbc2bd5ea0d6d50189fc6ccf81cd426f60))


### Code Refactoring

* adapt yargs calls to v18 API ([f0ea1c7](https://github.com/opening-hours/opening_hours.js/commit/f0ea1c7b70ab1b2114a6fd255b91e1db3ac4b352))
* remove non-functional concept script `scripts/gen_word_error_correction.js`` ([c22fff9](https://github.com/opening-hours/opening_hours.js/commit/c22fff9bac62a540e7953304fed26c68be41bd0b))
* remove redundant entries from manual word corrections ([b5fc898](https://github.com/opening-hours/opening_hours.js/commit/b5fc8986ccf725d0a1610690dc0112d7cb7cff37))
* replace String.prototype patching with c namespace for style helpers ([8e384bd](https://github.com/opening-hours/opening_hours.js/commit/8e384bd969072773a46b723dd4a88934fe40b420))

## [3.11.0](https://github.com/opening-hours/opening_hours.js/compare/v3.10.0...v3.11.0) (2026-01-25)


### Features

* add helpful error message for invalid variable time offset syntax ([c817897](https://github.com/opening-hours/opening_hours.js/commit/c8178976b7e5868f3b02e309f3af57af3735ba1c))
* **evaluation-tool:** improve diff comparison UX and dark mode ([b63ca2d](https://github.com/opening-hours/opening_hours.js/commit/b63ca2d51e7c818dacfcd9c15ff6d602efa7f347))
* **evaluation-tool:** improve language selection UX ([d2e8dec](https://github.com/opening-hours/opening_hours.js/commit/d2e8dec6a1153253e330663b8daac8dae52f4722))
* **evaluation-tool:** modernize UI with dark mode and responsive design ([f706813](https://github.com/opening-hours/opening_hours.js/commit/f7068138da13e7a51a63fb710241914b9411b6bb))
* **evaluation-tool:** redesign status display with timeline and improved table ([5d060a8](https://github.com/opening-hours/opening_hours.js/commit/5d060a8d7831d2122d02c098dc6f5a4bc71ea28f))
* **holidays:** migrate school holidays to OpenHolidays data ([b9b48f0](https://github.com/opening-hours/opening_hours.js/commit/b9b48f01eddbec261ccdb4d2de9f2319129e965c))


### Bug Fixes

* add missing else in formatWarnErrorMessage function ([4c41166](https://github.com/opening-hours/opening_hours.js/commit/4c41166f3e3dbcf80fa95722d5b6ad330f19594e))
* **evaluation-tool:** fix specification links in value_explanation ([6807459](https://github.com/opening-hours/opening_hours.js/commit/680745923629cfa15a8051d9e045d95141910b86)), closes [#546](https://github.com/opening-hours/opening_hours.js/issues/546)
* remove redundant console logs from formatWarnErrorMessage function ([78d6395](https://github.com/opening-hours/opening_hours.js/commit/78d63952fc62bd581aaae31a2c0a1204015d5e09))
* **scripts:** handle empty/invalid JSON files in real_test.js ([bab7f5a](https://github.com/opening-hours/opening_hours.js/commit/bab7f5a093eedff14a1ec5e88fd2a7117916564e))
* **tooling:** fix taginfo downloads with pagination support ([7b5d777](https://github.com/opening-hours/opening_hours.js/commit/7b5d777d75be33d5d5f14b186602428e70bbfe05))


### Data Updates

* **fr:** add 2026-2027 school holidays and fix 2024 dates ([383525e](https://github.com/opening-hours/opening_hours.js/commit/383525eac0a45dbc23e5fd484f6b2c44566ededb))
* update Argentina 2026 public holidays ([73eb195](https://github.com/opening-hours/opening_hours.js/commit/73eb195d2b59b6b2d1727da694de31539e5a6b0e))


### Documentation

* `build` is not a valid commit scope to avoid `build(build)` ([f26b82b](https://github.com/opening-hours/opening_hours.js/commit/f26b82b6ef82d75a171f1c5f63fcc9fe9421e3a2))
* add `evaluation-tool` as common git commit scope ([93a13d7](https://github.com/opening-hours/opening_hours.js/commit/93a13d72eb19461bed053e2b93c57d71a51e53ae))
* do not overuse the term "main" to avoid confusion ([4bf17d8](https://github.com/opening-hours/opening_hours.js/commit/4bf17d8be6e082c8fc0b56c19c55691154732030))
* **evaluation-tool:** remove term "GPG" from noscript HTML tag ([aa8e75c](https://github.com/opening-hours/opening_hours.js/commit/aa8e75c621154f2067dc65620b15d8efa8625e16))
* give more specific commit message example ([972558c](https://github.com/opening-hours/opening_hours.js/commit/972558c0a1ff7d29faf09c0b7fb4ca445b4a527c))
* **readme:** mention Major Evaluation Tool Redesign under Maintainers ([5d076c8](https://github.com/opening-hours/opening_hours.js/commit/5d076c84f8dffa75621c9e53fd02569ec68c827f)), closes [#542](https://github.com/opening-hours/opening_hours.js/issues/542)
* update osm-tag-data-check to osm-tag-data-taginfo-check ([25812d6](https://github.com/opening-hours/opening_hours.js/commit/25812d6c6c3da2d89966e5f6d523cd480d0044b1))
* update Releasing section ([7c0da2f](https://github.com/opening-hours/opening_hours.js/commit/7c0da2f554275cca35d99cafdd3dfb2c4b99a324))
* update VCS URL of YoHours ([6974460](https://github.com/opening-hours/opening_hours.js/commit/6974460d052b7ef3e29ae6934c1001c36afea401))


### Code Refactoring

* **evaluation-tool:** export module state from helpers/main instead of window globals ([acb9393](https://github.com/opening-hours/opening_hours.js/commit/acb9393717711b5226477d9ebdb78ae0adfca973))
* **evaluation-tool:** extract inline scripts ([680d323](https://github.com/opening-hours/opening_hours.js/commit/680d32328ca3d5f992ef29b05d8f03a3e7beb998))
* **evaluation-tool:** improve handleDiffComparison type safety and readability ([84fa9a8](https://github.com/opening-hours/opening_hours.js/commit/84fa9a8711b78c7084c528c7794085fa63d7e0f7))
* **evaluation-tool:** improve readability of generateValueExplanation ([73ac361](https://github.com/opening-hours/opening_hours.js/commit/73ac36193f18df4408de1297e5850b986d94008d))
* **evaluation-tool:** merge example lists ([1ec616a](https://github.com/opening-hours/opening_hours.js/commit/1ec616a34f6bfeacc314454e1d08339d7de613d9)), closes [#103](https://github.com/opening-hours/opening_hours.js/issues/103)
* **evaluation-tool:** migrate to ES modules ([714eb22](https://github.com/opening-hours/opening_hours.js/commit/714eb22d25c044dc664b0486b3afe6b015f3a7de))
* **evaluation-tool:** modernize Nominatim geocoding ([4e0b3d8](https://github.com/opening-hours/opening_hours.js/commit/4e0b3d8b9ac108c1261fe02383aab8329bbb32a6))
* **evaluation-tool:** move script tags to head with defer ([18b0499](https://github.com/opening-hours/opening_hours.js/commit/18b049999a65f2d2eaaaa885a739af119121c5fb))
* **evaluation-tool:** remove unused hidden iframe ([9f7bced](https://github.com/opening-hours/opening_hours.js/commit/9f7bced69f33d3cb67aafc23b543678f296cde8d))
* **evaluation-tool:** rename printDate func to toISODateString ([d15af56](https://github.com/opening-hours/opening_hours.js/commit/d15af566a8664fd3ac47cd6ced03999894f18b66))
* **evaluation-tool:** replace `javascript:` URLs with event delegation ([3172e07](https://github.com/opening-hours/opening_hours.js/commit/3172e0768d8f90fe20a8e5c2fb974455a1e7ed8d))
* **evaluation-tool:** replace jQuery with modern vanilla JavaScript ([7e450d0](https://github.com/opening-hours/opening_hours.js/commit/7e450d099103c012d512f81f65115ed60326c024))
* **evaluation-tool:** replace repetitive inline handlers with event delegation ([b3cf85f](https://github.com/opening-hours/opening_hours.js/commit/b3cf85fca535d3cd09a5930c1208b89ffe14e52b))
* **evaluation-tool:** replace XMLHttpRequest with fetch API ([190989d](https://github.com/opening-hours/opening_hours.js/commit/190989d6ed14ef1cb9af4456aa30bde064fa9a4e))
* **evaluation-tool:** simplify and modernize permalink generation ([aa06419](https://github.com/opening-hours/opening_hours.js/commit/aa06419823316da6fe2a22a55afb7fcfbc77920f))
* **evaluation-tool:** simplify initialization flow ([72f5e9c](https://github.com/opening-hours/opening_hours.js/commit/72f5e9c4d6e3f8a549455de58cde899e75d00405))
* **evaluation-tool:** streamline DOM manipulation by removing unnecessary checks ([1ca6e20](https://github.com/opening-hours/opening_hours.js/commit/1ca6e20ed826eee2fa4c6452e29479a1e83597f3))
* **evaluation-tool:** use semantic HTML elements ([b5b8fe7](https://github.com/opening-hours/opening_hours.js/commit/b5b8fe799dc30957ca8ab28bae805fb7801b4f1c))
* **evaluation-tool:** use template literals and const/let ([386d600](https://github.com/opening-hours/opening_hours.js/commit/386d600aeeb87ad7d41551beb39ada16ce713781))
* **evaluation-tool:** use URLSearchParams in page initialization ([3851dfb](https://github.com/opening-hours/opening_hours.js/commit/3851dfb21711a2b62a98b02c9949496b7a2c0ddf))
* **holiday:** extract parseSingleHolidayToken and simplify main loop ([3b593f9](https://github.com/opening-hours/opening_hours.js/commit/3b593f9ab9eb0e9a4ade675af5a6931213dcc79e))
* **PH:** extract public holiday selector as standalone function ([e5d4aa1](https://github.com/opening-hours/opening_hours.js/commit/e5d4aa1b6f332f004f7f9fd8a6cbf2ae95ce59d6))
* replace i18next with lightweight custom i18n in core library ([96972fd](https://github.com/opening-hours/opening_hours.js/commit/96972fda2ee702767b8928024531071a37db193a))
* **SH:** extract helper functions for date/range handling ([217b4e9](https://github.com/opening-hours/opening_hours.js/commit/217b4e9fda4279c861e71a4ba1548c8518684934))
* **SH:** extract school holiday selector as standalone function ([85692a1](https://github.com/opening-hours/opening_hours.js/commit/85692a1f8c2e891a5934ddd6747fa332f1240a89)), closes [#75](https://github.com/opening-hours/opening_hours.js/issues/75)
* **SH:** make school holiday parsing independent of data order ([7320458](https://github.com/opening-hours/opening_hours.js/commit/7320458df7426a41c226448fd76d9583bbf8acab))

## [3.10.0](https://github.com/opening-hours/opening_hours.js/compare/v3.10.0-rc.1...v3.10.0) (2025-12-22)

## [3.10.0-rc.1](https://github.com/opening-hours/opening_hours.js/compare/v3.10.0-rc.0...v3.10.0-rc.1) (2025-12-21)


### Bug Fixes

* include opening_hours.js that is referenced as main in package.json ([bde66e9](https://github.com/opening-hours/opening_hours.js/commit/bde66e9b649dddd158092e4acd20b42e915f1cfe))

## [3.10.0-rc.0](https://github.com/opening-hours/opening_hours.js/compare/v3.9.0...v3.10.0-rc.0) (2025-12-21)


### Features

* Add 24/12 as holiday in pl ([1a979cf](https://github.com/opening-hours/opening_hours.js/commit/1a979cf857b9b67cf432fa2a2f6d26240e175c9c))
* add script to update German shool holidays ([d9113ff](https://github.com/opening-hours/opening_hours.js/commit/d9113ffe129af8e733089689e41900ca69c3dc6e))
* **build:** add ESM build to npm package ([79428b4](https://github.com/opening-hours/opening_hours.js/commit/79428b4d9b38fd389547e4d06f32deb6364a00e2))
* **DE:** update Frauentag states to include Mecklenburg-Vorpommern ([66e71c5](https://github.com/opening-hours/opening_hours.js/commit/66e71c5ffc31e6625c469acc4367a5346a61ca37))


### Bug Fixes

* add missing `country_code` to `xa.yaml` ([e869d1f](https://github.com/opening-hours/opening_hours.js/commit/e869d1fd8c9a932fd1222df0e637449569afd653))
* handle markdown issues found by new linter plugin ([12a4e61](https://github.com/opening-hours/opening_hours.js/commit/12a4e61276599ca2e1e9b8d981c36bea863763a0))
* localize expected test strings for German locale ([3f63c97](https://github.com/opening-hours/opening_hours.js/commit/3f63c9758ec74117688ebf545c44bb20852c00a0))
* resume periodic week schedules mid-range ([84a4e23](https://github.com/opening-hours/opening_hours.js/commit/84a4e23d23ebc0609eff240452b658f04057e46c)), closes [#524](https://github.com/opening-hours/opening_hours.js/issues/524)
* **test:** correct two `sunrise` test expectations to match SunCalc output ([c0309cf](https://github.com/opening-hours/opening_hours.js/commit/c0309cfbcd2013ab4b78ccd1fb27fc738e9fdd5c))
* update `package-json-validator` command to use `pjv.js` ([fede2d4](https://github.com/opening-hours/opening_hours.js/commit/fede2d4e82ae2901453d365df2c464955e6acf5d))
* update script paths and use python for regex search execution ([d12eab6](https://github.com/opening-hours/opening_hours.js/commit/d12eab6ffa3ad4bbbfc590899bf5b220063cd0cc))
* update syntax in `regex_search.py` ([6fe31e5](https://github.com/opening-hours/opening_hours.js/commit/6fe31e5016ed065c65f26a2d48b5dcbd4b47299a))
* use full date comparison for constrained weekday matching ([e1a91cd](https://github.com/opening-hours/opening_hours.js/commit/e1a91cd3517e27ae088fabe9da4093779aa8f3b2))

## Changelog of v3.9.0 and below

For v3.9.0 and below, the changelog was written manually. The project adhered
to [Semantic Versioning](https://semver.org/spec/v2.0.0.html) and
[human-readable changelog](https://keepachangelog.com/en/0.3.0/).

Note that most of the v2.X.Z releases have not been added to the changelog yet.

## Authors

- [AMDmi3] - Dmitry Marakasov (original author)
- [ypid] - Robin Schneider (author, maintainer)

## Contributors

- [putnik] - Sergey Leschina
- [Cactusbone] - Charly Koza
- [don-vip] - Vincent Privat
- [sesam] - Simon B.
- [NonnEmilia]
- [damjang]
- [jgpacker] - João G. Packer
- [openfirmware] - James Badger
- [burrbull] - Zgarbul Andrey
- [blorger] - Blaž Lorger
- [dmromanov] - Dmitrii Romanov
- [maxerickson]
- [amenk] - Alexander Menk
- [edqd]
- [simon04] - Simon Legner
- [MKnight] - Michael Knight
- [elgaard] - Niels Elgaard Larsen
- [afita] - Adrian Fita
- [sanderd17]
- [marcgemis]
- [drMerry]
- [endro]
- [rmikke] - Ryszard Mikke
- [VorpalBlade] - Arvid Norlander
- [mmn] - Mikael Nordfeldth
- [adrianojbr]
- [AndreasTUHU]
- [mkyral] - Marián Kyral
- [pke] - Philipp Kursawe
- [spawn-guy] - Paul Rysiavets
- [bugvillage]
- [ItsNotYou]
- [chiak597]
- [skifans] - Alex
- [shouze] - Sébastien HOUZÉ
- [Gazer75]
- [yourock17]
- [urbalazs] - Balázs Úr
- [HolgerJeromin] - Holger Jeromin
- [Gerw88]
- [sommerluk] - Lukas Sommer
- [Discostu36] - Michael
- [debyos] - Gábor Babos
- [StephanGeorg] - Stephan Georg
- [hariskar] - Haris K
- [Virtakuono] - Juho Häppölä
- [blef00fr]
- [mstock] - Manfred Stock
- [emilsivro]
- [simonpoole] - Simon Poole
- [jmontane] - Joan Montané
- [Mortein] - Kiel Hurley
- [stefanct] - Stefan Tauner
- [KristjanESPERANTO] - Kristjan
- [Robot8A] - Héctor Ochoa Ortiz
- [pietervdvn] - Pieter Vander Vennet
- [napei] - Nathaniel Peiffer
- [fodor0205]
- [goodudetheboy] - Vuong Ho
- [MerlinPerrotLegler] - Merlin Perrot

Thanks very much to all contributors!

### Supporters

- [iMi digital]
- [AddisMap]

Thanks for helping by allowing employees to work on the project during
work hours!

## [v3.9.0](https://github.com/opening-hours/opening_hours.js/compare/v3.8.0...v3.9.0) - 2025-05-31

[v3.9.0 milestone](https://github.com/opening-hours/opening_hours.js/issues?q=milestone%3Av3.9.0+is%3Aclosed)

### Added

- Public holiday definitions added:
  - Chinese (#406)
  - Croatian
  - Luxembourg (#460)
  - Namibian (#452)
- School holiday definitions added:
  - Croatian
  - France
  - Luxembourg (#460)

### Changed

- Public holiday definitions updated:
  - Argentina (#456)
  - Swedish and Finnish (#465)
- School holiday definitions updated:
  - Belgium (#457)
  - German (#468)
  - Hungarian (#466)
- Evaluation tool: Optimize "Error and warning messages" layout
- chore: Update CI in `ci.yml` (#468)
  - Replace deprecated `set-output`
  - Test with maintained node versions
  - Update actions
- chore: Upgrade `colors`, `husky` and `eslint` (#468)
- chore: Update dependencies (#468)
- chore: Move minification into rollup and remove `esbuild` (#468)
- chore: Also build sourcemap to minified files (#468)
- chore: Add code-style-check to CI (#468)
- chore: Change benchmark script to esm (#468)
- ci: switch to LTS Node.js version for code style check in workflow (#488)
- ci: update supported Node.js versions in CI workflow (#488)

### Fixed

- JOSM remote control was not working because it was trying to be accessed as <https://localhost:8111/>. Switch to HTTP.
- Evaluation tool: Fix timebar wrap on certain zoom levels in Firefox (issue \#419)
- Evaluation tool: Fix Russian and Ukrainian pluralization by updating `i18next` and using API version V4 (#468)
- chore: Drop `yamlToJson.mjs` (#468) - There are better tools like <https://mikefarah.gitbook.io/yq> that do this. No need to maintain our own.
- chore: Fix `make list` (#468)

## [v3.8.0](https://github.com/opening-hours/opening_hours.js/compare/v3.7.0...v3.8.0) - 2022-05-18

### Added

- Public holiday definitions added:
  - Argentina - Japanese
- Localizations added:
  - Vietnamese
  - Japanese

### Changed

- School holiday definitions updated:
  - Romania
  - France

### Fixed

- Typing for typescript

## [v3.7.0](https://github.com/opening-hours/opening_hours.js/compare/v3.6.0...v3.7.0) - 2021-07-24

[v3.7.0 milestone](https://github.com/opening-hours/opening_hours.js/issues?q=milestone%3Av3.7.0+is%3Aclosed)

### Added

- Typing for typescript \[[MerlinPerrotLegler]]

## [v3.6.0](https://github.com/opening-hours/opening_hours.js/compare/v3.5.0...v3.6.0) - 2021-04-24

[v3.6.0 milestone](https://github.com/opening-hours/opening_hours.js/issues?q=milestone%3Av3.6.0+is%3Aclosed)

### Added

- Public holiday definitions added:
  - Australia \[[yourock17], [ypid]]
  - England and Wales \[[skifans], [simon04]]
  - Finland \[[Virtakuono]]
  - Greece \[[hariskar]]
  - Ireland \[[Gerw88], [ypid]]
  - Ivory Coast \[[sommerluk], [ypid]]
  - New Zealand \[[Mortein]]
  - Norway \[[Gazer75]]
  - Spain \[[jmontane]]
  - Switzerland \[[mstock], [emilsivro], [simonpoole], [ypid]]
  - Vietnam \[[goodudetheboy]]
- School holiday definitions added:
  - Austria \[[simon04]]
  - Belgium \[[pietervdvn]]
  - France \[[blef00fr], [ypid]]
  - Germany 2017 until 2024 \[[ypid], [KristjanESPERANTO]]
  - Greece \[[hariskar], [ypid]]
- Added Easter Sunday to Slovak holidays. \[[chiak597]]
- Localizations added:
  - Hungarian \[[urbalazs], [debyos]]
  - Spanish \[[Robot8A], [ypid]]
- Translate error tolerance warnings into German. \[[ypid]]
- Add +/-1 week button to evaluation tool. \[[stefanct]]
- Add additional warnings:
  - Misused `.` character. Example: `Jan 01,Dec 24.-25.`. \[[ypid]]
  - Trailing `,` after time selector. Example: `We 12:00-18:00,`. \[[ypid]]
  - Additional rule which evaluates to closed. Example: `Mo-Fr 10:00-20:00, We off`. \[[ypid]]
  - Value consists of multiple rules each only using a time selector. Example: `11:30-14:30;17:30-23:00`. \[[ypid]]
  - Potentially missing use of `<additional_rule_separator>` if the previous rule has a time range which wraps over midnight and the current rule matches one of the following days of the previous rule. One that the warning is not emitted in case wide range selectors are used in both involved rules to avoid a false positive warning where the two rules would never match days directly following each other. Nevertheless this check has false positives and which can be ignored in cases mentioned in the warning. Example: `Fr 22:00-04:00; Sa 21:00-04:00` \[[ypid]]
- Extend error tolerance:
  - Handle super/subscript digits properly. Example: `Mo 00³°-¹⁴:⁰⁹`. \[[ypid]]
  - Handle misused `.` character following a number. Example: `Jan 01,Dec 24.-25.`. \[[ypid]]

### Changed

- Public holiday definitions updated:
  - Germany \[[StephanGeorg]]
- Migrated to use [ES2015 modules](https://exploringjs.com/es6/ch_modules.html) and [rollup](https://rollupjs.org/) for module bundling. \[[simon04]]
- Increased NodeJS version requirement to `10.0.0`. \[[ypid]]
- Update to holiday definition format 2.2.0. Holidays are now maintained in YAML files, one for each country. \[[ypid]]
- Update to holiday definition format 3.0.0. Use nested key-value pairs instead of arrays with a known structure. \[[ypid]]
- Rework the way Nominatim responses are handled (used for testing). \[[ypid]]
- Allow "gaps" in school holiday definitions. This became necessary because countries/states might add/remove holidays like winter holidays from one year to another. \[[ypid]]
- Error tolerance: For a value such as `Mo-Fr 08:00-12:00 by_appointment` the tool did previously suggest to use `Mo-Fr 08:00-12:00 "on appointment"` but as whether to use `by appointment` or `on appointment` is not defined the tool now just uses the already given variant (`Mo-Fr 08:00-12:00 "by appointment"` in this case). \[[ypid]]
- Error tolerance: Interpret the German `werktags?` as `Mo-Sa` instead of `Mo-Fr`. Ref: [§ 3 Bundesurlaubsgesetz (BUrlG)](https://www.gesetze-im-internet.de/burlg/__3.html). \[[ypid]]
- Make error tolerance warnings translatable. \[[ypid]]
- Improved performance of common constructor calls by factor 6! \[[ypid]]
- Improve number input in the evaluation tool and other HTML and CSS improvements. Useful for example on mobile devices. \[[HolgerJeromin], [ypid]]
- Change from localized dates to ISO 8601 in evaluation tool. The syntax has no support for legacy stuff like AM/PM or weirdly written dates anyway. Commit to ISO 8601 all the way regardless of local quirks. \[[ypid]]
- Merge country into state holidays. This avoids repeating country-wide holidays. \[[simon04]]
- Update simple HTML usage example for using the library in a website. [[KristjanESPERANTO], [ypid]\]
- Replaced moment.js with Date.toLocaleString \[[simon04]]
- Change directory layout of the project. \[[napei], [ypid]]
- Switch from i18next-client to i18next dependency (no longer as peer dependency). \[[fodor0205], [ypid]]

### Fixed

- Fix German public holiday definitions. Since 2018, Reformationstag is also a public holiday in Bremen, Schleswig-Holstein, Niedersachsen and Hamburg. \[[Discostu36], [ypid]]
- Fix Russian public holiday definitions. Regions where not in local language and thus not matched properly. \[[ypid]]
- Fix school holiday selector code which caused the main selector traversal function to not advance any further (returning closed for all following dates) after the school holiday selector code hit a holiday definition ending on the last day of the year. \[[ypid]]
- Fix `check-diff-%.js` Makefile target. `git diff` might not have shown changes or failed to return with an error before. \[[ypid]]
- Fix support for legacy browsers (IE) with using proper for...in loops. \[[shouze]]
- Error tolerance: Fix mapping of Spanish weekdays. \[[maxerickson]]
- Do not zero pad `positive_number` symbols by default in `oh.prettifyValue`. \[[ypid]]

## [v3.5.0](https://github.com/opening-hours/opening_hours.js/compare/v3.4.0...v3.5.0) - 2017-02-17

[v3.5.0 milestone](https://github.com/opening-hours/opening_hours.js/issues?q=milestone%3Av3.5.0+is%3Aclosed)

### Added

- Public holiday definitions added:
  - Brazil \[[adrianojbr]]
  - Sweden \[[VorpalBlade], [mmn], [ypid]]
  - Poland \[[endro], [rmikke]]
  - Czech \[[mkyral]]
  - Hungary \[[AndreasTUHU]]
  - Slovakia \[[chiak597]]
- School holiday definitions added: Hungary \[[AndreasTUHU]]
- Changelog file. \[[ypid]]
- Holidays definition documentation 2.1.0. \[[ypid]]
- AMD with RequireJS. \[[ItsNotYou]]
- Test the package on Travis CI against a version matrix (refer to `.travis.yml` for details). \[[ypid]]

### Changed

- Make the evaluation tool prettier. \[[MKnight]]
- Use `peerDependencies` to allow dependency reuse by other npm packages. \[[pke], [ypid]]
- Use caret ranges for all npm dependencies. \[[ypid], [pke]]
- Increased NodeJS version requirement to `0.12.3` which fixes one test case. \[[ypid]]

### Fixed

- Public holiday definitions fixed:
  - Germany, Saxony: Add missing "Buß- und Bettag" to the public holiday definition of \[[bugvillage], [ypid]]
  - Fix the `getDateOfWeekdayInDateRange` helper function used to calculate PH of Sweden and Germany Saxony. PH definitions using this functions might have been wrong before. \[[ypid]]
- Fix timezone problem in `PH_SH_exporter.js` (local time was interpreted as UTC). \[[ypid]]
- Fix handling of legacy 12-hour clock format. `12:xxAM` and `12:xxPM` was handled incorrectly! \[[ypid]]
- Fix timezone issue for `PH_SH_exporter.js` unless the `--omit-date-hyphens` option was given. Exported dates which are in DST might be wrong when your system is in a timezone with DST and DST was not active when you run the script. \[[ypid]]
- Fix current week number calculation which was caused by incorrect use of `new Date()` which is a "Reactive" variable. \[[spawn-guy]]

## [v3.4.0](https://github.com/opening-hours/opening_hours.js/compare/v3.3.0...v3.4.0) - 2016-01-02

[v3.4.0 milestone](https://github.com/opening-hours/opening_hours.js/issues?q=milestone%3Av3.4.0+is%3Aclosed)

### Added

- Public holiday definitions added:
  - Danish \[[elgaard]]
  - Denmark \[[elgaard]]
  - Belgium \[[sanderd17], [marcgemis]]
  - Romania \[[afita]]
  - Netherlands \[[drMerry]]
- School holiday definitions added: Romania \[[afita]]
- Localizations added: Dutch \[[marcgemis]]
- Added simple HTML usage example for using the library in a website. \[[ypid]]
- Browserified the library. \[[simon04]]
- `oh.isEqualTo`: Implemented check if two oh objects have the same meaning (are equal). \[[ypid]]
- Expose `oh.isEqualTo` in the evaluation tool. \[[ypid]]

### Changed

- Changed license to LGPL-3.0-only. \[[ypid]]
- Refer to YoHours in the evaluation tool. \[[ypid]]
- Use HTTPS everywhere (in the documentation and in code comments). \[[ypid]]

### Fixed

- Lots of small bugs and typos fixes. \[[ypid]]
- No global locale change. \[[ypid]]

## [v3.3.0](https://github.com/opening-hours/opening_hours.js/compare/v3.2.0...v3.3.0) - 2015-08-02

[v3.3.0 milestone](https://github.com/opening-hours/opening_hours.js/issues?q=milestone%3Av3.3.0+is%3Aclosed)

### Added

- Public holiday definitions added: Czech Republic \[[edqd]]
- Support for localized error and warning messages. \[[amenk] funded by [iMi digital] and [AddisMap]]
- Support to localize oh.prettifyValue opening_hours value. \[[amenk] funded by [iMi digital] and [AddisMap]]
- Wrote SH_batch_exporter.sh and added support to write (SH) definitions for all states in Germany. \[[ypid]]
- Added more tests to the test framework. \[[ypid]]

### Changed

- Updated translation modules to latest versions.

### Fixed

- Fixed false positive warning for missing PH for value 'PH'.
- Fixed evaluation of SH after year wrap (of by one).

## [v3.2.0](https://github.com/opening-hours/opening_hours.js/compare/v3.1.1...v3.2) - 2015-05-16

[v3.2.0 milestone](https://github.com/opening-hours/opening_hours.js/issues?q=milestone%3Av3.2+is%3Aclosed)

### Added

- Show warning for missing PH. Required API extension (fully backwards compatible, upgrade recommended).
- Show warning for year in past, not year range.
- Added more error checking and tests for: Wrong constructor call, e.g bad parameters.
- Added more tests to the test framework.

### Changed

- Improved input/error tolerance.
- Refactored source code.
- Updated examples in evaluation tool.
- Statistics: Optimized Overpass import.
- Statistics: Fixed wrong stats for 'not prettified'.
- Statistics: real_test.js: Implemented punchcard weekly report generation. See [blog post](https://www.openstreetmap.org/user/ypid/diary/34881).
- Statistics: Wrote `gen_weekly_task_report`.

## [v3.1.1](https://github.com/opening-hours/opening_hours.js/compare/v3.1.0...v3.1.1) - 2015-04-12

[v3.1.1 milestone](https://github.com/opening-hours/opening_hours.js/issues?q=milestone%3Av3.1.1+is%3Aclosed)

### Added

- Public holiday definitions added: Italian \[[damjang], [ypid]]
- Added support to use data from the Overpass API to generate statistics.

### Changed

- Give better error message for wrong usage of `<additional_rule_separator>`.
- Always use strict `===` comparison in JavaScript.

## [v3.1.0](https://github.com/opening-hours/opening_hours.js/compare/v3.0.2...v3.1.0) - 2015-02-15

[v3.1.0 milestone](https://github.com/opening-hours/opening_hours.js/issues?q=milestone%3Av3.1.0+is%3Aclosed)

### Added

- Public holiday definitions added:
  - USA and python script for testing the holiday JSON (ref: [us_holidays](https://github.com/maxerickson/us_holidays)) \[[maxerickson]]

### Fixed

- Public holiday definitions fixed: France

## [v3.0.2](https://github.com/opening-hours/opening_hours.js/compare/v3.0.1...v3.0.2) - 2015-01-24

### Added

- Added `make release` target.

### Changed

- package.json: Narrowed down version of dependencies.
- Enhanced Makefile.
- Updated README.md

## [v3.0.1](https://github.com/opening-hours/opening_hours.js/compare/v3.0.0...v3.0.1) - 2015-01-24

[v3.0.1 milestone](https://github.com/opening-hours/opening_hours.js/issues?q=milestone%3Av3.0.1+is%3Aclosed)

### Added

- Public holiday definitions added: Russian \[[dmromanov]]
- Improved error tolerance for values `bis open end` and `Sonn- und Feiertags`.
- real_test.js: Added the following OSM tags to the evaluation: - Key:happy_hours - Key:delivery_hours - Key:opening_hours:delivery
- Evaluation tool: Added `noscript` tag to give a hint to the user to enable JavaScript.

### Fixed

- Fixed up README.md.
- Fixed error when parsing input value `SH off; Mo-Sa 18:00+`.
- Require 2.7.x of the moment library because of API change in recent versions.

## [v3.0.0](https://github.com/opening-hours/opening_hours.js/compare/v2.1.9...v3.0.0) - 2014-09-08

[v3.0.0 milestone](https://github.com/opening-hours/opening_hours.js/issues?q=milestone%3Av3.0.0+is%3Aclosed)

### Added

- Release notes.
- `oh.prettifyValue`: Implemented selector reordering.
- `oh.prettifyValue`: Changed API for optional parameters. API is backwards compatible in case you are not using any of the optional parameters.
- Evaluation tool: Highlight selectors and other tokens and give more information.
- real_test.js: Write verbose log file for all values and states.
- real_test.js: Added tag filter command line parameter and csv stats output.
- Created favicon.
- Bundle (and test) minified version as `opening_hours.min.js`.
- More unit tests:
  - Rule has no time selector.
  - Changed default state not first rule like `Mo 12:00-14:00; closed`.
  - Valid use of `<separator_for_readability>`.
  - And more.

### Changed

- `oh.getMatchingRule`: Changed API. Not backwards compatible.
- Week selector rework. Using ISO 8601 week dates.
- Made second rule of '07:00+,12:00-16:00; 16:00-24:00 closed "needed because of open end"' obsolete.
- Improved error tolerance.
- real_test.js: Enhanced implementation.

### Fixed

- Fixed evaluation for some (not to often used) values.
- Optimized source code with JSHint. Some internal variables where defined in global scope.
- Removed duplicate warnings for `test.addShouldWarn` in test framework.

## [v2.1.9](https://github.com/opening-hours/opening_hours.js/compare/v2.1.8...v2.1.9) - 2014-08-17

### Added

- Many more unit tests.
- Internal tokens array documentation.
- Using moment.js for date localization.

### Changed

- Many improve error tolerance: comments, am/pm time format, …
- Updated examples in the evaluation tool.
- Internal refactoring and enhancements.

### Fixed

- Fixed problems reported by `real_test`
- Fixed bug in test framework.

## [v2.1.8](https://github.com/opening-hours/opening_hours.js/compare/v2.1.7...v2.1.8) - 2014-04-26

### Added

- Public holiday definitions added: Canadian \[[openfirmware]], Ukraine \[[burrbull]], Slovenian \[[blorger]]
- Localizations added: Ukrainian \[[burrbull]]

### Fixed

- Localizations fixed: Russian \[[openfirmware]]

## [v2.1.0](https://github.com/opening-hours/opening_hours.js/compare/v2.0.0...v2.1.0) - 2014-03-03

### Added

- Public holiday definitions added: French \[[don-vip]]
- Localizations added: French \[[don-vip]], Ukrainian \[[jgpacker]], Italian \[[NonnEmilia]]

### Fixed

- Docs: Improved understandability of overlapping rules in README.md. \[[sesam]]

## [v2.0.0](https://github.com/opening-hours/opening_hours.js/compare/v1.0.0...v2.0.0) - 2013-10-27

### Added

- `package.json` file. \[[Cactusbone]]

## v1.0.0 - 2013-01-12

### Added

- Initial coding and design. \[[AMDmi3]]

### Changed

- demo page (now called evaluation tool) improvements. \[[putnik]]

[AMDmi3]: https://github.com/AMDmi3
[ypid]: https://me.ypid.de/
[putnik]: https://github.com/putnik
[Cactusbone]: https://github.com/Cactusbone
[don-vip]: https://github.com/don-vip
[sesam]: https://github.com/sesam
[NonnEmilia]: https://github.com/NonnEmilia
[damjang]: https://github.com/damjang
[jgpacker]: https://github.com/jgpacker
[openfirmware]: https://github.com/openfirmware
[burrbull]: https://github.com/burrbull
[blorger]: https://github.com/blorger
[dmromanov]: https://github.com/dmromanov
[maxerickson]: https://github.com/maxerickson
[amenk]: https://github.com/amenk
[edqd]: https://github.com/edqd
[simon04]: https://github.com/simon04
[MKnight]: https://github.com/dex2000
[elgaard]: https://github.com/elgaard
[afita]: https://github.com/afita
[sanderd17]: https://github.com/sanderd17
[marcgemis]: https://github.com/marcgemis
[drMerry]: https://github.com/drMerry
[endro]: https://github.com/endro
[rmikke]: https://github.com/rmikke
[VorpalBlade]: https://github.com/VorpalBlade
[mmn]: https://blog.mmn-o.se/
[adrianojbr]: https://github.com/adrianojbr
[AndreasTUHU]: https://github.com/AndreasTUHU
[mkyral]: https://github.com/mkyral
[pke]: https://github.com/pke
[spawn-guy]: https://github.com/spawn-guy
[bugvillage]: https://github.com/bugvillage
[ItsNotYou]: https://github.com/ItsNotYou
[chiak597]: https://github.com/chiak597
[skifans]: https://github.com/skifans
[shouze]: https://github.com/shouze
[Gazer75]: https://github.com/Gazer75
[yourock17]: https://github.com/yourock17
[urbalazs]: https://github.com/urbalazs
[HolgerJeromin]: https://github.com/HolgerJeromin
[Gerw88]: https://github.com/Gerw88
[sommerluk]: https://github.com/sommerluk
[Discostu36]: https://github.com/Discostu36
[debyos]: https://github.com/debyos
[StephanGeorg]: https://github.com/StephanGeorg
[hariskar]: https://github.com/hariskar
[Virtakuono]: https://github.com/Virtakuono
[blef00fr]: https://github.com/blef00fr
[mstock]: https://github.com/mstock
[emilsivro]: https://github.com/emilsivro
[simonpoole]: https://github.com/simonpoole
[jmontane]: https://github.com/jmontane
[Mortein]: https://github.com/Mortein
[stefanct]: https://github.com/stefanct
[KristjanESPERANTO]: https://github.com/KristjanESPERANTO
[Robot8A]: https://www.openstreetmap.org/user/Robot8A
[pietervdvn]: https://github.com/pietervdvn
[napei]: https://nathaniel.peiffer.com.au/
[fodor0205]: https://github.com/fodor0205
[goodudetheboy]: https://github.com/goodudetheboy
[MerlinPerrotLegler]: https://github.com/MerlinPerrotLegler
[iMi digital]: https://www.imi-digital.de/
[AddisMap]: https://www.addismap.com/
