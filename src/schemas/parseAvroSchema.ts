import alert from 'cli-alerts';
import avro from 'avro-js';

export async function parseAvroSchema(schemaFile: any) {
    alert({
        type: `success`,
        name: `Parsing Avro schema...`,
        msg: ``
    });

    if (global.debug) {
        const parsed = avro.parse(schemaFile);
        console.log(parsed);
    }

    let schema = [];
    let parsed = JSON.parse(schemaFile);
    schema.push(parsed);

    schema = await convertAvroSchemaToJson(schema);

    return schema;
}


async function convertAvroSchemaToJson(schema: any): Promise<any> {
    let jsonSchema = [];
    schema.forEach(table => {
        let schema = {
            _meta: {
                topic: table.name
            }
        };
        table.fields.forEach(column => {
            if (column.type === 'record') {
                schema[column.name] = convertAvroSchemaToJson(column.type);
            } else {
                if (Array.isArray(column.type)) {
                    if (column.type.length === 2 && column.type[0] === 'null') {
                        return schema[column.name] = avroTypesToFakerJs(column.type[1]);
                    }
                } else {
                    // If nested, generated nested json recursively
                    if (column.type.type === 'array') {
                        return schema[column.name] = 'faker.datatype.array()';
                    }
                    return schema[column.name] = avroTypesToFakerJs(column.type);
                }
            }
        });
        jsonSchema.push(schema);
    });

    return jsonSchema;
}

function avroTypesToFakerJs(avroType: any) {
    // Function to convert Avro types to Faker.js types
    switch (avroType) {
        case 'string':

            return 'faker.datatype.string()';
        case 'int':
            return 'faker.datatype.number()';
        case 'long':
            return 'faker.datatype.number()';
        case 'float':
            return 'faker.datatype.number()';
        case 'double':
            return 'faker.datatype.number()';
        case 'boolean':
            return 'faker.datatype.boolean()';
        case 'bytes':
            return 'faker.datatype.string()';
        case 'array':
            return 'faker.datatype.array()';
        case 'map':
            return 'faker.datatype.object()';
        case 'union':
            return 'faker.datatype.union()';
        case 'enum':
            return 'faker.datatype.string()';
        case 'fixed':
            return 'faker.datatype.string()';
        case 'record':
            return 'faker.datatype.object()';
        default:
            return 'faker.datatype.string()';
    }
}
