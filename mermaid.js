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
        primaryColor: '#2a4134',
        primaryBorderColor: '#a1dbb6',
        primaryTextColor: '#f1f4f0',
        lineColor: '#b4c1b9',
        secondaryColor: '#202b27',
        tertiaryColor: '#18201e',
        mainBkg: '#202b27',
        nodeBorder: '#a1dbb6',
        textColor: '#f1f4f0'
      } : {
        primaryColor: '#e3efe8',
        primaryBorderColor: '#226549',
        primaryTextColor: '#17221d',
        lineColor: '#54645c',
        secondaryColor: '#f1f5f1',
        tertiaryColor: '#ffffff',
        mainBkg: '#ffffff',
        nodeBorder: '#226549',
        textColor: '#17221d'
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
