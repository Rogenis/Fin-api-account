const { response } = require('express');
const express = require('express');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(express.json());

const customers = [];

// Middleware
function verifyIfExistsAccountCPF(request, response, next) {
  const { cpf } = request.headers;

  const customer = customers.find((customer) => customer.cpf === cpf);

  if (!customer) {
    return response.status(400).json({ error: "Customer not found" });
  }

  request.customer = customer;

  return next();
}

function getBalance(statement) {
  const balance = statement.reduce((acc, operation) => {
    if (operation.type === 'credit') {
      return acc + operation.amount;
    } else {
      return acc - operation.amount;
    }
  }, 0);

  return balance;
}

app.post('/account', (req, res) => {
  const { name, cpf } = req.body;

  const userExists = customers.some(customer => customer.cpf === cpf);

  if (userExists) {
    return res.status(400).json({error: 'cpf already exists'})
  };

  customers.push({
    id: uuidv4(),
    cpf,
    name,
    statement: [],
  });

  return res.status(201).send();
});

// app.use(verifyIfExistsAccountCPF); -> global middleware (all routes)
app.get('/statement', verifyIfExistsAccountCPF, (req, res) => {
  const { customer } = req;

  return res.json(customer.statement);
});

app.post('/deposit', verifyIfExistsAccountCPF, (req, res) => {
  const { description, amount } = req.body;
  const { customer } = req;

  const statementOperation = {
    description,
    amount,
    created_at: new Date(),
    type: 'credit'
  }

  customer.statement.push(statementOperation);

  return res.status(201).send();
});

app.post('/withdraw', verifyIfExistsAccountCPF, (req, res) => {
  const { amount } = req.body;
  const { customer } = req;

  const balance = getBalance(customer.statement);
  if(balance < amount) {
    return res.status(400).json({error: 'Insufficient funds!'});
  }

  const statementOperation = {
    amount,
    created_at: new Date(),
    type: 'debit'
  }

  customer.statement.push(statementOperation);

  return res.status(201).send();
});

app.get('/statement/date', verifyIfExistsAccountCPF, (req, res) => {
  const { customer } = req;
  const { date } = req.query;

  const dateFormat = new Date(date + ' 00:00');
  const statement = customer.statement.filter(
    (statement) => 
    statement.created_at.toDateString() === new Date(dateFormat).toDateString())
    
    res.json(statement);
});

app.get('/account', verifyIfExistsAccountCPF, (req, res) => {
  const { customer } = req;

  res.json(customer);
});

app.put('/account', verifyIfExistsAccountCPF, (req, res) => {
  const { customer } = req;
  const { name } = req.body;
  
  customer.name = name;
    
  res.status(201).send();
});

app.delete('/account', verifyIfExistsAccountCPF, (req, res) => {
  const { customer } = req;

  customers.splice(customer, 1);
    
  res.status(200).json(customers);
});

app.get('/balance', verifyIfExistsAccountCPF, (req, res) => {
  const { customer } = req;
  const balance = getBalance(customer.statement);

  res.json(balance);
});

app.listen(3333);