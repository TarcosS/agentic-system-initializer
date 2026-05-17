#!/usr/bin/env node

import { Command } from "commander";
import { initCommand } from "./commands/init.js";
import { profileCommand } from "./commands/profile.js";
import { validateCommand } from "./commands/validate.js";
import { generateCommand } from "./commands/generate.js";
import { clearCommand } from "./commands/clear.js";

const program = new Command();

program
  .name("agentinit")
  .description(
    "Initialize AI coding agent configurations — compile agentic-system-initializer into targeted, user-profiled scaffolds"
  )
  .version("0.1.0");

program.addCommand(initCommand);
program.addCommand(profileCommand);
program.addCommand(validateCommand);
program.addCommand(generateCommand);
program.addCommand(clearCommand);

program.parse();
