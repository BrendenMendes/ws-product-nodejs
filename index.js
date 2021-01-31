const express = require('express')
const pg = require('pg')
const redis = require('redis')

const app = express()
// configs come from standard PostgreSQL env vars
// https://www.postgresql.org/docs/9.6/static/libpq-envars.html
// const pool = new pg.Pool()
const pool = new pg.Pool({
  user: 'readonly',
  host: 'work-samples-db.cx4wctygygyq.us-east-1.rds.amazonaws.com',
  database: 'work_samples',
  password: 'w2UIO@#bg532!',
  port: 5432,
})

const redis_port = process.env.PORT || 6379;
const redis_client = redis.createClient(redis_port);

const queryHandler = (req, res, next) => {
  pool.query(req.sqlQuery).then((r) => {
    redis_client.setex(req.originalUrl, 120, JSON.stringify(r.rows));
    return res.json(r.rows || [])
  }).catch(next)
}

const checkCache = (req, res, next) => {
  redis_client.get(req.originalUrl, (err, data) => {
    if (err) {
         console.log(err);
         res.status(500).send(err);
    }
    if (data != null) {
      console.log('cache')
      res.send(data);
    } 
    else {
         next();
    }
  });
};

app.get('/', (req, res) => {
  res.send('Welcome to EQ Works 😎')
})

app.get('/events/hourly', checkCache, (req, res, next) => {
  console.log(req.originalUrl)
  req.sqlQuery = `
    SELECT date, hour, events 
    FROM public.hourly_events 
    ORDER BY date, hour 
    LIMIT 168;
  `
  return next()
}, queryHandler)

app.get('/events/daily', checkCache, (req, res, next) => {
  req.sqlQuery = `
    SELECT date, SUM(events) AS events
    FROM public.hourly_events
    GROUP BY date
    ORDER BY date
    LIMIT 7;
  `
  return next()
}, queryHandler)

app.get('/stats/hourly', checkCache, (req, res, next) => {
  req.sqlQuery = `
    SELECT date, hour, impressions, clicks, revenue
    FROM public.hourly_stats
    ORDER BY date, hour
    LIMIT 168;
  `
  return next()
}, queryHandler)

app.get('/stats/daily', checkCache, (req, res, next) => {
  req.sqlQuery = `
    SELECT date,
        SUM(impressions) AS impressions,
        SUM(clicks) AS clicks,
        SUM(revenue) AS revenue
    FROM public.hourly_stats
    GROUP BY date
    ORDER BY date
    LIMIT 7;
  `
  return next()
}, queryHandler)

app.get('/poi', checkCache, (req, res, next) => {
  req.sqlQuery = `
    SELECT *
    FROM public.poi;
  `
  return next()
}, queryHandler)

app.listen(process.env.PORT || 5555, (err) => {
  if (err) {
    console.error(err)
    process.exit(1)
  } else {
    console.log(`Running on ${process.env.PORT || 5555}`)
  }
})

// last resorts
process.on('uncaughtException', (err) => {
  console.log(`Caught exception: ${err}`)
  process.exit(1)
})
process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at: Promise', p, 'reason:', reason)
  process.exit(1)
})
