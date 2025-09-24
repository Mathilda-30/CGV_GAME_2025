// src/menu.js
import { goToLevel1 } from './main.js';

export function showMenu() {
  const menu = document.createElement('div');
  menu.id = 'menu';
  menu.style.position = 'absolute';
  menu.style.top = '0';
  menu.style.left = '0';
  menu.style.width = '100%';
  menu.style.height = '100%';
  menu.style.background = 'black';
  menu.style.display = 'flex';
  menu.style.flexDirection = 'column';
  menu.style.alignItems = 'center';
  menu.style.justifyContent = 'center';
  menu.style.color = 'white';
  menu.style.fontFamily = 'sans-serif';
  menu.style.fontSize = '32px';

  const title = document.createElement('h1');
  title.innerText = 'Crystal Quest';
  menu.appendChild(title);

  const startBtn = document.createElement('button');
  startBtn.innerText = 'Start Game';
  startBtn.style.padding = '15px 30px';
  startBtn.style.fontSize = '20px';
  startBtn.style.cursor = 'pointer';
  startBtn.style.marginTop = '20px';
  menu.appendChild(startBtn);

  document.body.appendChild(menu);

  startBtn.addEventListener('click', () => {
    document.body.removeChild(menu);
    goToLevel1();
  });
}
