#!/usr/bin/env node

/**
 * Fake Data Generator
 * Materialize CLI app
 *
 * @author Bobby Iliev <https://github.com/bobbyiliev>
 */
import end from './src/utils/end.js';
import alert from 'cli-alerts';

import { parseSqlSchema } from './src/schemas/parseSqlSchema.js';
import { parseAvroSchema } from './src/schemas/parseAvroSchema.js';
import parseJsonSchema from './src/schemas/parseJsonSchema.js';
import cleanKafka from './src/kafka/cleanKafka.js';
import dataGenerator from './src/dataGenerator.js';
import fs from 'fs';
import { program, Option } from 'commander';

program.name('datagen').description('Fake Data Generator').version('0.2.1');

program
    .requiredOption('-s, --schema <char>', 'Schema file to use')
    .addOption(
        new Option('-f, --format <char>', 'The format of the produced data')
            .choices(['json', 'avro'])
            .default('json')
    )
    .addOption(
        new Option(
            '-n, --number <int>',
            'Number of records to generate. For infinite records, use -1'
        ).default('10').argParser((value) => parseInt(value))
    )
    .option('-c, --clean', 'Clean (delete) Kafka topics and schema subjects previously created')
    .option('-dr, --dry-run', 'Dry run (no data will be produced to Kafka)')
    .option('-d, --debug', 'Output extra debugging information')
    .option('-w, --wait <int>', 'Wait time in ms between record production', parseInt)
    .option('-rs, --record-size <int>', 'Record size in bytes, eg. 1048576 for 1MB', parseInt)
    .option('-p, --prefix <char>', 'Kafka topic and schema registry prefix');

program.parse();

const options = program.opts();

if (!fs.existsSync(options.schema)) {
    alert({
        type: `error`,
        name: `Schema file ${options.schema} does not exist!`,
        msg: ``
    });
    process.exit(1);
}

global.debug = options.debug;
global.recordSize = options.recordSize;
global.wait = options.wait;
global.clean = options.clean;
global.dryRun = options.dryRun;
global.prefix = options.prefix;

if (global.debug) {
    console.log(options);
}

if (!global.wait) {
    global.wait = 0;
}

(async () => {
    let parsedSchema;
    let schemaFile;

    // Parse the schema file
    try {
        // Read the schema file extension
        const schemaFormat = options.schema.split('.').pop();
        switch (schemaFormat) {
            case 'avsc':
                schemaFile = fs.readFileSync(options.schema, 'utf8');
                parsedSchema = await parseAvroSchema(schemaFile);
                break;
            case 'json':
                schemaFile = fs.readFileSync(options.schema, 'utf8');
                parsedSchema = await parseJsonSchema(schemaFile);
                break;
            case 'sql':
                parsedSchema = await parseSqlSchema(options.schema);
                break;
            default:
                alert({
                    type: `error`,
                    name: `Schema file ${options.schema} is not supported!`,
                    msg: `Supported formats are: .avsc, .json, .sql`
                });
                break;
        }
    } catch (error) {
        alert({
            type: `error`,
            name: `Could not parse schema`,
            msg: `\n  ${error.message}`
        });
        process.exit(1);
    }

    if (global.clean) {
        let topics = []
        for (let table of parsedSchema) {
            topics.push(table._meta.topic)
        }
        await cleanKafka(options.format, topics)
        process.exit(0);
    }

    // Generate data
    await dataGenerator({
        format: options.format,
        schema: parsedSchema,
        number: options.number
    })

    await end();

    process.exit(0);
})();
