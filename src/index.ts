import express, { Request, Response } from 'express';
import mysql, { MysqlError } from 'mysql';

interface Person {
  id: number;
  name: string;
}

const app = express();
const port = 3000;

const connection = mysql.createConnection({
  host: 'mysql-db',
  user: 'root',
  password: 'password',
});

connection.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL: ' + err.stack);
    return;
  }

  console.log('Connected to MySQL as id ' + connection.threadId);

  connection.query('CREATE DATABASE IF NOT EXISTS fullcycle', (err) => {
    if (err) {
      console.error('Error creating database: ' + err.stack);
      return;
    }

    console.log('Database created or already exists');
    connection.changeUser({ database: 'fullcycle' }, (err) => {
      if (err) {
        console.error('Error changing to database: ' + err.stack);
        return;
      }

      console.log('Changed to database fullcycle');

      connection.query(`
        CREATE TABLE IF NOT EXISTS people (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL
        )
      `, (err) => {
        if (err) {
          console.error('Error creating table: ' + err.stack);
          return;
        }

        console.log('Table created or already exists');

        const names = ['Joao', 'Maria', 'Pedro', 'Ana'];

        const insertPromises = names.map(name => {
          return new Promise<number>((resolve, reject) => {
            connection.query(`INSERT INTO people (name) VALUES ('${name}')`, (err, result) => {
              if (err) reject(err);
              resolve(result.insertId);
            });
          });
        });

        Promise.all(insertPromises)
          .then(() => {
            console.log('Names inserted');

            app.get('/', async (req, res) => {
              try {
                const rows = await getPeople();

                let namesList = '';
                for (const row of rows) {
                  namesList += `id: ${row.id}, name: ${row.name}<br>`;
                }
                res.send(`<h1>Full Cycle Rocks!</h1><br>${namesList}`);
              } catch (err: any) {
                console.error('Error retrieving people: ' + err.stack);
                res.status(500).send('Internal Server Error');
              }
            });

            app.listen(port, () => {
              console.log(`App running on port ${port}`);
            });
          })
          .catch((err) => {
            console.error('Error inserting names: ' + err.stack);
            connection.end();
            process.exit(1);
          });
      });
    });
  });
});

function getPeople(): Promise<Person[]> {
  return new Promise<Person[]>((resolve, reject) => {
    connection.query('SELECT * FROM people', (err: mysql.MysqlError, rows: Person[]) => {
      if (err) reject(err);
      resolve(rows);
    });
  });
}

process.on('exit', () => {
  console.log('Closing connection to MySQL');
  connection.query('DROP DATABASE IF EXISTS fullcycle', (err) => {
    if (err) {
      console.error('Error dropping database: ' + err.stack);
      return;
    }
    console.log('Database dropped');
    connection.end();
  });
});