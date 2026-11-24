document.addEventListener('DOMContentLoaded', () => {
  const tables = document.querySelectorAll('.prose table');
  for (const table of tables) {
    const wrapper = document.createElement('div');
    wrapper.className = 'table-scroll';
    wrapper.tabIndex = 0;
    wrapper.setAttribute('role', 'region');
    wrapper.setAttribute('aria-label', '可横向滚动的表格');
    table.before(wrapper);
    wrapper.append(table);
  }

  const blocks = document.querySelectorAll('.prose .language-mermaid pre code, .prose pre.language-mermaid code, .prose pre code.language-mermaid');
  for (const code of blocks) {
    const wrapper = code.closest('.highlighter-rouge') || code.closest('pre');
    const diagram = document.createElement('div');
    diagram.className = 'mermaid-diagram';
    diagram.dataset.mermaidSource = code.textContent;
    diagram.textContent = code.textContent;
    wrapper.replaceWith(diagram);
  }

  if (!blocks.length || !window.mermaid) return;

  async function renderDiagrams() {
    const dark = document.documentElement.classList.contains('dark');
    window.mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: 'base',
      themeVariables: dark ? {
        primaryColor: '#23382c',
        primaryBorderColor: '#94d6ad',
        primaryTextColor: '#eef2ed',
        lineColor: '#a7b7ad',
        secondaryColor: '#1a2420',
        tertiaryColor: '#131a17',
        mainBkg: '#1a2420',
        nodeBorder: '#94d6ad',
        textColor: '#eef2ed'
      } : {
        primaryColor: '#e4efe7',
        primaryBorderColor: '#1f6247',
        primaryTextColor: '#16201b',
        lineColor: '#56665d',
        secondaryColor: '#f1f5f1',
        tertiaryColor: '#fffefa',
        mainBkg: '#fffefa',
        nodeBorder: '#1f6247',
        textColor: '#16201b'
      }
    });

    const diagrams = document.querySelectorAll('.mermaid-diagram');
    for (const diagram of diagrams) {
      diagram.removeAttribute('data-processed');
      diagram.textContent = diagram.dataset.mermaidSource;
    }
    try {
      await window.mermaid.run({ nodes: diagrams });
    } catch (error) {
      console.error('Mermaid 图表渲染失败', error);
    }
  }

  renderDiagrams();
  document.querySelector('#theme')?.addEventListener('click', () => setTimeout(renderDiagrams, 0));
});
