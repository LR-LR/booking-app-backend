const express = require('express');
const graphqlHTTP = require('express-graphql');
const { buildSchema } = require('graphql');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const Event = require('./models/event');
const User = require('./models/user');

const app = express();

app.use(express.json());

app.use(
  '/api',
  graphqlHTTP({
    schema: buildSchema(`
      type Event {
        _id: ID!
        title: String!
        description: String!
        price: Float!
        date: String!
      }

      type User {
        _id: ID!
        email: String!
        password: String
      }

      input EventInput {
        title: String!
        description: String!
        price: Float!
        date: String!
      }

      input UserInput {
        email: String!
        password: String!
      }

      type RootQuery {
        events: [Event!]!
      }

      type RootMutation {
        createEvent(eventInput: EventInput!): Event
        createUser(userInput: UserInput!): User
      }

      schema {
        query: RootQuery
        mutation: RootMutation
      }
    `),
    rootValue: {
      events: () => {
        return Event.find()
          .then((events) => {
            return events.map((event) => {
              return event;
            });
          })
          .catch((err) => {
            throw err;
          });
      },

      createEvent: (args) => {
        const newEvent = new Event({
          title: args.eventInput.title,
          description: args.eventInput.description,
          price: args.eventInput.price,
          date: new Date(args.eventInput.date),
          creator: '5db87c7156990f4618f944b8'
        });

        return newEvent
          .save()
          .then((newEvent) => {
            User.updateOne(
              { _id: '5db87c7156990f4618f944b8' },
              {
                $push: { createdEvents: newEvent }
              }
            ).exec();
          })
          .then(() => {
            return newEvent;
          })
          .catch((err) => {
            throw err;
          });
      },

      createUser: (args) => {
        return User.findOne({ email: args.userInput.email })
          .then((user) => {
            if (user) {
              throw new Error('User exists already');
            }
            return bcrypt.hash(args.userInput.password, 12);
          })
          .then((hashedPassword) => {
            const newUser = new User({
              email: args.userInput.email,
              password: hashedPassword
            });
            return newUser.save();
          })
          .then((result) => {
            result.password = null;
            return result;
          })
          .catch((err) => {
            throw err;
          });
      }
    },
    graphiql: true
  })
);

mongoose
  .connect(
    `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@cluster0-vdzi4.mongodb.net/${process.env.MONGO_DB}?retryWrites=true&w=majority`,
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true
    }
  )
  .then(() => {
    app.listen(3000);
  })
  .catch((err) => {
    console.error(err);
  });
