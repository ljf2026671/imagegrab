/* 图提取官网交互脚本：导航吸顶阴影、移动端菜单、滚动动画、导航高亮 */

// 1. 滚动时给导航加阴影
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 10);
});

// 2. 移动端汉堡菜单
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('navLinks');
hamburger.addEventListener('click', () => navLinks.classList.toggle('open'));
navLinks.querySelectorAll('a').forEach((a) =>
  a.addEventListener('click', () => navLinks.classList.remove('open'))
);

// 3. 滚动进入视口时淡入上移
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        observer.unobserve(e.target);
      }
    });
  },
  { threshold: 0.15 }
);
document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));

// 4. 当前区块导航高亮
const sections = ['intro', 'features', 'install', 'cta']
  .map((id) => document.getElementById(id))
  .filter(Boolean);
const linkMap = {};
navLinks.querySelectorAll('a').forEach((a) => {
  const id = a.getAttribute('href').slice(1);
  linkMap[id] = a;
});
window.addEventListener('scroll', () => {
  let current = '';
  sections.forEach((s) => {
    if (window.scrollY >= s.offsetTop - 120) current = s.id;
  });
  Object.entries(linkMap).forEach(([id, a]) => {
    a.classList.toggle('active', id === current);
  });
});
