const STORAGE_KEY = 'todos';

let todos = [];

const form = document.getElementById('todo-form');
const input = document.getElementById('todo-input');
const list = document.getElementById('todo-list');
const stats = document.getElementById('todo-stats');

function loadTodos() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    todos = JSON.parse(saved);
  }
}

function saveTodos() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function addTodo(text) {
  const todo = {
    id: generateId(),
    text: text.trim(),
    completed: false,
    createdAt: new Date().toISOString()
  };
  todos.unshift(todo);
  saveTodos();
  render();
}

function toggleTodo(id) {
  const todo = todos.find(t => t.id === id);
  if (todo) {
    todo.completed = !todo.completed;
    saveTodos();
    render();
  }
}

function deleteTodo(id) {
  todos = todos.filter(t => t.id !== id);
  saveTodos();
  render();
}

function createTodoElement(todo) {
  const li = document.createElement('li');
  li.className = 'todo-item' + (todo.completed ? ' completed' : '');

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = todo.completed;
  checkbox.addEventListener('change', () => toggleTodo(todo.id));

  const span = document.createElement('span');
  span.textContent = todo.text;

  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = '削除';
  deleteBtn.addEventListener('click', () => deleteTodo(todo.id));

  li.appendChild(checkbox);
  li.appendChild(span);
  li.appendChild(deleteBtn);

  return li;
}

function renderStats() {
  const total = todos.length;
  const completed = todos.filter(t => t.completed).length;
  const remaining = total - completed;

  if (total === 0) {
    stats.textContent = '';
  } else {
    stats.textContent = `全${total}件 | 完了${completed}件 | 残り${remaining}件`;
  }
}

function render() {
  list.innerHTML = '';

  if (todos.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'empty-message';
    empty.textContent = 'タスクがありません';
    list.appendChild(empty);
  } else {
    todos.forEach(todo => {
      list.appendChild(createTodoElement(todo));
    });
  }

  renderStats();
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (text) {
    addTodo(text);
    input.value = '';
    input.focus();
  }
});

loadTodos();
render();
