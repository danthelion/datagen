import fs from "fs";
import {OpenAI} from "langchain/llms/openai";
import {PromptTemplate} from "langchain";
import path from "path";

export async function generateFakerRecordFromExampleRecord(exampleRecord: any) {
    // Find path to prompt file in parent folder
    const promptText = await fs.promises.readFile(
        path.join(path.resolve(), '/src/utils/examplerecord_parser_prompt.txt'),
        'utf8'
    );
    const model = new OpenAI({ temperature: 0.0 , maxTokens: -1});
    const prompt = new PromptTemplate({
        template: promptText,
        inputVariables: ["example_json_record"],
    });
    const input = await prompt.format({example_json_record: exampleRecord})
    const response = await model.call(
        input,
    )
    return JSON.parse(response);
}
