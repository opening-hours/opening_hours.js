/*
 * SPDX-FileCopyrightText: © 2025 Kristjan ESPERANTO <https://github.com/KristjanESPERANTO>
 *
 * SPDX-License-Identifier: LGPL-3.0-only
 */

/*
  This script fetches the German school holidays from the ferien-api [1][2] and
  updates the YAML file (de.yaml) with the new data.

  The script is intended to be run from the root directory with the following command:
  node scripts/update_german_sh.mjs [year]
  The year parameter is optional and defaults to the current year.

  [1] https://ferien-api.maxleistner.de/
  [2] https://github.com/maxleistner/deutsche-schulferien-api
*/

import { exec } from 'node:child_process';
import fs from "fs/promises";
import yaml from "yaml";

const year = process.argv[2] || new Date().getFullYear();
const API_URL = `https://ferien-api.maxleistner.de/api/v1/${year}/`;
const YAML_FILE = "src/holidays/de.yaml";

// Convert data to an inline YAML format
function toInlineYaml(data) {
  if (Array.isArray(data)) {
    return `[${data.join(", ")}]`;
  } else if (typeof data === "object" && data !== null) {
    const entries = Object.entries(data).map(([k, v]) => {
      return `"${k}": ${toInlineYaml(v)}`;
    });
    return `{${entries.join(", ")}}`;
  } else {
    return JSON.stringify(data);
  }
}

// Build the YAML string
function convertToYaml(data, intendDash) {
  let yamlString = "";

  for (const [key, value] of Object.entries(data)) {
    if (key === "PH") {
      yamlString +=
        "PH:  # https://de.wikipedia.org/wiki/Feiertage_in_Deutschland\n";
      value.forEach(item => {
        yamlString += `  - ${toInlineYaml(item)}\n`;
      });
    } else if (key === "SH") {
      yamlString += `  SH:\n`;
      value.forEach(item => {
        yamlString += `    - name: '${item.name}'\n`;
        for (const [key, value] of Object.entries(item)) {
          if (isFinite(key)) {
            yamlString += `      ${key}: ${toInlineYaml(value)}\n`;
          }
        }
      });
    } else if (key.startsWith("_")) {
      if (intendDash) {
        yamlString += `  ${key}: '${value}'\n`;
      } else {
        yamlString += `${key}: '${value}'\n\n`;
      }
    } else {
      yamlString += `${key}:\n`;
      yamlString += `${convertToYaml(value, true)}\n`;
    }
  }
  return yamlString;
}

async function fetchData() {
  console.log(`Fetching data from ${API_URL} ...`);
  const response = await fetch(API_URL);
  if (!response.ok) {
    console.error(`Failed to fetch data for year ${year}.`);
    process.exit(1);
  }
  return response.json();
}

async function readYaml() {
  try {
    const file = await fs.readFile(YAML_FILE, "utf8");
    return yaml.parse(file);
  } catch (error) {
    console.error("Error reading YAML file:", error);
    throw error;
  }
}

async function updateYaml(data) {
  try {
    const yamlData = await readYaml();
    const updatedData = { ...yamlData };

    // Reset/set the year array from the holidays
    Object.values(updatedData).forEach(state => {
      if (state.SH) {
        state.SH.forEach(holiday => {
          holiday[year] = [];
        });
      }
    }
    );


    data.forEach(entry => {
      const state = entry.stateCode.toLowerCase();
      const stateData = Object.values(updatedData).find(
        s => s._state_code === state
      );

      const holidayName =
        entry.name.charAt(0).toUpperCase() + entry.name.slice(1);
      let holidayData = Object.values(stateData.SH).find(
        h => h.name === holidayName
      );

      if (!holidayData) {
        holidayData = { name: holidayName };
        stateData.SH.push(holidayData);
        console.log(
          `Holiday "${holidayName}" not found in state "${state}". Added.`
        );
      }

      const startMonth = new Date(entry.start).getMonth() + 1;
      const startDay = new Date(entry.start).getDate();

      // endDate is exclusive, so we need to subtract 1 day from the end date
      const endDate = new Date(entry.end);
      endDate.setDate(endDate.getDate() - 1);
      const endMonth = endDate.getMonth() + 1;
      const endDay = endDate.getDate();

      try {
        holidayData[entry.year].push(startMonth);
        holidayData[entry.year].push(startDay);
        holidayData[entry.year].push(endMonth);
        holidayData[entry.year].push(endDay);
      } catch (error) {
        console.error("Error updating holiday data:", error);
        console.error("State:", state);
        console.error("Holiday:", holidayName);
        console.error("Data:", holidayData);
        console.error("Year:", entry.year);
        console.error("Start:", startMonth, startDay);
        console.error("End:", endMonth, endDay);
      }
    });

    let yamlString = "---\n\n";
    yamlString += convertToYaml(updatedData, false);
    // Remove double newlines at the end to satisfy the YAML linter
    yamlString = yamlString.replace(/\n\n$/, "\n");

    await fs.writeFile(YAML_FILE, yamlString, "utf8");
    console.log(`YAML file "${YAML_FILE}" updated successfully.`);
  } catch (error) {
    console.error("Error updating YAML file:", error);
  }
}

async function updateData() {
  try {
    const apiData = await fetchData();
    await updateYaml(apiData);
  } catch (error) {
    console.error("Error:", error);
  }
}

updateData();
