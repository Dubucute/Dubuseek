/** Regression test: unescaped inner quotes inside tagged tool-call arguments. */
import { describe, expect, it } from "vitest";

import { parseToolCalls } from "../../src/deepseek/toolCalls.js";

describe("unescaped inner quotes", () => {
  it("recovers a tagged call whose arguments contain unescaped inner quotes", () => {
    const raw =
      "Probing OCR tooling.\n<tool_call>\n" +
      "{" + String.fromCharCode(34) + "name" + String.fromCharCode(34) + ":" + String.fromCharCode(34) + "powershell" + String.fromCharCode(34) + "," + String.fromCharCode(34) + "arguments" + String.fromCharCode(34) + ":{" + String.fromCharCode(34) + "command" + String.fromCharCode(34) + ":" + String.fromCharCode(34) + "python -c " + String.fromCharCode(34) + "import pytesseract; print(1)" + String.fromCharCode(34) + "" + String.fromCharCode(34) + "," + String.fromCharCode(34) + "description" + String.fromCharCode(34) + ":" + String.fromCharCode(34) + "Probe" + String.fromCharCode(34) + "}}" +
      "\n</tool_call>";

    const result = parseToolCalls(raw, "quote-repair");

    expect(result.content).toBe("Probing OCR tooling.");
    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls[0]?.function.name).toBe("powershell");
    expect(JSON.parse(result.toolCalls[0]!.function.arguments)).toEqual({
      command: "python -c " + String.fromCharCode(34) + "import pytesseract; print(1)" + String.fromCharCode(34) + "",
      description: "Probe",
    });
  });

      it("does not leak a call whose argument string contains a nested tool_call literal", () => {
        const raw =
          "Done.\n<tool_call>\n" +
          JSON.stringify({
            name: "task_complete",
            arguments: { summary: "Wrapped a literal <tool_call>{\"name\":\"x\"}</tool_call> inside a string." },
          }) +
          "\n</tool_call>";

        const result = parseToolCalls(raw, "nested-tag");

        expect(result.content).toBe("Done.");
        expect(result.content).not.toContain("<tool_call>");
        expect(result.toolCalls).toHaveLength(1);
        expect(result.toolCalls[0]?.function.name).toBe("task_complete");
        expect(JSON.parse(result.toolCalls[0]!.function.arguments)).toEqual({
          summary: "Wrapped a literal <tool_call>{\"name\":\"x\"}</tool_call> inside a string.",
        });
      });
    });
