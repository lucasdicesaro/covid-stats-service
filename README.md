# COVID STATS SERVICE

This API provides useful stats about COVID.

## Prerequisites

- Node.js
- MongoDB


## Required Node libraries
- express
- mongoose
- csv-parser
- https
- cors
- firstline
- read-last-lines@1.8.0
- string-sanitizer
- dotenv (just for dev)
- nodemon (just for dev)


## Installation instructions
A .env file must be created in root folder with database connection.
```
DATABASE_HOST=mongodb://localhost/covid_stats_db
```
Startup the server
```shell
npm run devStart
```
