require('dotenv').config()
const { Schema, model, connection, connect, disconnect } = require('mongoose')

const encrypt = require(process.argv[2] === '_cf'
    ? 'mongoose-encryption-_cf'
    : 'mongoose-encryption')

const encryptionKey = 'CwBDwGUwoM5YzBmzwWPSI+KjBKvWHaablbrEiDYh43Q='
const signingKey =
    'dLBm74RU4NW3e2i3QSifZDNXIXBd54yr7mZp0LKugVUa1X1UP9qoxoa3xfA7Ea4kdVL+JsPg9boGfREbPCb+kw=='

/**
 * Schema with two secret fields that will be encrypted.
 */
const OldSchema = new Schema(
    {
        secretA: String,
        secretB: String,
        secretC: String,
        deep: 'Mixed',
    },
    { collection: 'tests' }
)

OldSchema.plugin(encrypt, {
    encryptionKey,
    signingKey,
    collectionId: 'tests',
    cfMode: 'store',
    encryptedFields: ['secretA', 'secretB', 'deep.stay_secret', 'deep.not_so_secret'],
})

const OldModel = model('OldModel', OldSchema)

/**
 * Schema with additional index.
 */
const NewSchema = new Schema(
    {
        secretA: String,
        secretB: String,
        secretC: String,
        deep: 'Mixed',
    },
    { collection: 'tests' }
)


NewSchema.plugin(encrypt, {
    encryptionKey,
    signingKey,
    collectionId: 'tests',
    cfMode: 'require',
    encryptedFields: ['secretB', 'secretC', 'deep.stay_secret', 'deep.should_be_secret'],
})

const NewModel = model('NewModel', NewSchema)

const create_test_record = async () => {
    const test_record = new OldModel({
        secretA: 'secretA',
        secretB: 'secretB',
        secretC: 'secretC',
        deep: {
            should_be_secret: 'should_be_secret',
            stay_secret: 'stay_secret',
            not_so_secret: 'not_so_secret',
        },
    })

    await test_record.save()
}

const save_using_new_schema = async () => {
    console.log('Re-saving with new schema')
    const [test_record] = await NewModel.find({})
    console.log(test_record)
    await test_record.save()
}

const update_cf_using_new_schema = async () => {
    console.log('Updating CF with new schema')
    const [test_record] = await NewModel.find({})
    test_record.updateCf()
    console.log(test_record, test_record.getChanges())
    await test_record.save()
}

const query_using_old_schema = async () => {
    console.log('Record content obtained by original schema:')
    const test_record = await OldModel.findOne({})
    console.log(test_record)
}

const query_using_new_schema = async () => {
    console.log('Record content obtained by new schema:')
    const [test_record] = await NewModel.find({})
    console.log(test_record)
}

const connect_and_run = async () => {
    await connect(process.env.MONGO_URI)
    await connection.db.collection('tests').deleteMany({})

    await create_test_record()
    console.log('')
    console.log('-------------')
    await query_using_old_schema()
    console.log('')
    console.log('-------------')
    await query_using_new_schema()
    console.log('')
    console.log('-------------')
    await save_using_new_schema()
    console.log('')
    console.log('-------------')
    await query_using_new_schema()
    console.log('')
    console.log('-------------')
    await query_using_old_schema()

    if (process.argv[2] === '_cf') {
        console.log('')
        console.log('-------------')
        await update_cf_using_new_schema()
        console.log('')
        console.log('-------------')
        await query_using_new_schema()
        console.log('')
        console.log('-------------')
        await query_using_old_schema()
    }


    await disconnect()
}

connect_and_run()
