import { chunk } from "lodash-es";

if (chunk([1, 2], 1).length !== 2) process.exitCode = 1;
