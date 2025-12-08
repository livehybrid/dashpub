/*
Copyright 2020 Splunk Inc. 

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import inquirer from 'inquirer';

// Helper function to create a string prompt
export const string = async (message, default_value = '') => {
  const { answer } = await inquirer.prompt([
    {
      type: 'input',
      name: 'answer',
      message,
      default: default_value
    }
  ]);
  return answer;
};

// Helper function to create a password prompt
export const password = async (message) => {
  const { answer } = await inquirer.prompt([
    {
      type: 'password',
      name: 'answer',
      message
    }
  ]);
  return answer;
};

// Helper function to create a list selection prompt
export const selectApp = async (apps) => {
  const { answer } = await inquirer.prompt([
    {
      type: 'list',
      name: 'answer',
      message: 'Select an app:',
      choices: apps
    }
  ]);
  return answer;
};

// Helper function to create a checkbox selection prompt for dashboards
export const selectDashboards = async (dashboards) => {
  const { answer } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'answer',
      message: 'Select dashboards to include:',
      choices: dashboards.map(d => ({
        name: d.label || d.name,
        value: d.name,
        checked: false
      }))
    }
  ]);
  return answer;
};

// Helper function to create a confirmation prompt
export const confirm = async (message, default_value = true) => {
  const { answer } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'answer',
      message,
      default: default_value
    }
  ]);
  return answer;
};
// Helper function to create a password prompt for Splunk credentials
export const splunkdPassword = async (url, user) => {
  const { answer } = await inquirer.prompt([
    {
      type: 'password',
      name: 'answer',
      message: `Enter password for user ${user} at ${url}:`
    }
  ]);
  return answer;
};
