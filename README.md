# sails-redis-schema

A redis adapter for Sails / Waterline with basic schema support.

## Installation

To install this adapter, run:

```sh
npm install sails-redis-schema
```

Then [connect the adapter](https://sailsjs.com/documentation/reference/configuration/sails-config-datastores) to one or more of your app's datastores.

## Usage

Visit [Models & ORM](https://sailsjs.com/docs/concepts/models-and-orm) in the docs for more information about using models, datastores, and adapters in your app/microservice.

## Compatibility

This adapter implements the following methods:

| Method               | Status            | Category      |
|:---------------------|:------------------|:--------------|
| registerDatastore    | _**in progress**_ | LIFECYCLE     |
| teardown             | _**in progress**_ | LIFECYCLE     |
| create               | Planned           | DML           |
| createEach           | Planned           | DML           |
| update               | Planned           | DML           |
| destroy              | Planned           | DML           |
| find                 | Planned           | DQL           |
| join                 | _**???**_         | DQL           |
| count                | Planned           | DQL           |
| sum                  | Planned           | DQL           |
| avg                  | Planned           | DQL           |
| define               | Planned           | DDL           |
| drop                 | Planned           | DDL           |
| setSequence          | _**???**_         | DDL           |


## License

**MIT**
