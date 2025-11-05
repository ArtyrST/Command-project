const modal = document.getElementById('modal');
const closeBtn = document.getElementById('closeBtn');
const previewBtns = document.querySelectorAll('.preview-btn');

previewBtns.forEach(btn => {
  btn.addEventListener('click', () => modal.classList.add('show'));
});

closeBtn.addEventListener('click', () => modal.classList.remove('show'));
modal.addEventListener('click', e => {
  if (e.target === modal) modal.classList.remove('show');
});
