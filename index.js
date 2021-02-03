const express = require('express')
const pg = require('pg')
const redis = require('redis')
const path = require('path')
const bodyParser = require('body-parser')
const fuzzySearch = require('./fuzzy_search.js')
const config = require('./config.json')

const app = express()
app.use(express.json());
// app.use(bodyParser.json({ type: 'application/*+json' }))
// configs come from standard PostgreSQL env vars
// https://www.postgresql.org/docs/9.6/static/libpq-envars.html
// const pool = new pg.Pool()
const pool = new pg.Pool({
  user: process.env.DB_USER || config.DB_USER,
  host: process.env.DB_HOST || config.DB_HOST,
  database: process.env.DB_NAME || config.DB_NAME,
  password: process.env.DB_PASSWORD || config.DB_PASSWORD,
  port: process.env.DB_PORT || config.DB_PORT,
})

const redis_port = process.env.REDIS_PORT || config.REDIS_PORT;
const redis_client = redis.createClient(redis_port);

redis_client.on('connect', function(){
    console.log('Connected to Redis');
});

redis_client.on('error', function(err) {
     console.log('Redis error: ' + err);
});

const queryHandler = (req, res, next) => {
  pool.query(req.sqlQuery).then((r) => {
    redis_client.setex(req.originalUrl, 20, JSON.stringify(r.rows));
    if(req.originalUrl == '/poi'){
      res.send(fuzzySearch(r.rows, req.body.query))
    }
    else{
      res.json(r.rows || [])
    }
  }).catch(next)
}

const checkCache = (req, res, next) => {
  try{
    redis_client.get(req.originalUrl, (err, data) => {
      if (err) {
           console.log(err);
           next()
      }
      if (data != null) {
        console.log('cache')
        if(req.originalUrl == '/poi'){
          res.send(fuzzySearch(JSON.parse(data), req.body.query))
        }
        else{
          res.send(data);
        }
      }
      else {
           next();
      }
    });
  }
  catch(e){
    console.log(e)
  }
  finally{
    next();
  }
};

app.use(express.static('static'))

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname + '/index.html'));
})

app.get('/events/:from/:to', checkCache, (req, res, next) => {
  console.log(req.body.from, req.body.to)
  req.sqlQuery = ` 
    SELECT date, hour, events
    FROM public.hourly_events
    WHERE date >= '${req.params.from}T05:00:00.000Z'
    AND 
    date <= '${req.params.to}T05:00:00.000Z'
    ORDER BY date, hour`
  return next()
}, queryHandler)

app.get('/stats/:from/:to', checkCache, (req, res, next) => {
  req.sqlQuery = ` 
    SELECT date,
        SUM(impressions) AS impressions,
        SUM(clicks) AS clicks,
        SUM(revenue) AS revenue
    FROM public.hourly_stats
    WHERE date >= '${req.params.from}T05:00:00.000Z'
    AND 
    date <= '${req.params.to}T05:00:00.000Z'
    GROUP BY date
    ORDER BY date`
  return next()
}, queryHandler)

app.get('/events/hourly', checkCache, (req, res, next) => {
  console.log(req.originalUrl)
  req.sqlQuery = `
    SELECT date, hour, events 
    FROM public.hourly_events 
    ORDER BY hour, date 
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

app.post('/poi', checkCache, (req, res, next) => {
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
