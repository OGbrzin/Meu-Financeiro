/**
 * Meu Financeiro - Lógica da Aplicação
 * Desenvolvido com HTML, CSS e JS puro.
 * Armazenamento via localStorage.
 */

// Estado global da aplicação
let state = {
    transacoes: [],
    meta: 0,
    gastosFixos: []
};

// ==========================================
// INICIALIZAÇÃO
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    setupEventListeners();
    updateUI();
});

// ==========================================
// ARMAZENAMENTO LOCAL (LOCALSTORAGE)
// ==========================================
function loadData() {
    const savedData = localStorage.getItem('meuFinanceiroData');
    if (savedData) {
        try {
            const parsed = JSON.parse(savedData);
            state.transacoes = parsed.transacoes || [];
            state.meta = parsed.meta || 0;
            state.gastosFixos = parsed.gastosFixos || [];
            checkNewMonthFixedExpenses();
        } catch (e) {
            showToast('Erro ao carregar dados locais.', 'error');
        }
    }
}

function checkNewMonthFixedExpenses() {
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    let modified = false;
    
    state.gastosFixos.forEach(gf => {
        if (gf.ultimoMesAtualizado !== currentMonthStr) {
            gf.status = 'pendente';
            gf.ultimoMesAtualizado = currentMonthStr;
            modified = true;
        }
    });
    
    if (modified) {
        localStorage.setItem('meuFinanceiroData', JSON.stringify(state));
    }
}

function saveData() {
    localStorage.setItem('meuFinanceiroData', JSON.stringify(state));
    updateUI();
}

// ==========================================
// LISTENERS DE EVENTOS
// ==========================================
function setupEventListeners() {
    // Formulário de Transação
    const form = document.getElementById('form-transaction');
    form.addEventListener('submit', handleAddTransaction);

    // Controle do campo Status (mostrar apenas para ganhos)
    const tipoSelect = document.getElementById('tipo');
    const groupStatus = document.getElementById('group-status');
    const statusSelect = document.getElementById('status');
    
    // Set inicial baseado no valor padrão
    if (tipoSelect.value === 'gasto') {
        groupStatus.classList.add('hidden');
        statusSelect.removeAttribute('required');
    }

    tipoSelect.addEventListener('change', (e) => {
        if (e.target.value === 'ganho') {
            groupStatus.classList.remove('hidden');
            statusSelect.setAttribute('required', 'required');
        } else {
            groupStatus.classList.add('hidden');
            statusSelect.removeAttribute('required');
        }
    });

    // Filtros
    document.getElementById('filter-mes').addEventListener('change', updateTransactionList);
    document.getElementById('filter-tipo').addEventListener('change', updateTransactionList);
    document.getElementById('filter-conta').addEventListener('change', updateTransactionList);

    // Meta Mensal
    document.getElementById('btn-edit-goal').addEventListener('click', toggleGoalEdit);
    document.getElementById('btn-cancel-goal').addEventListener('click', toggleGoalEdit);
    document.getElementById('goal-edit-form').addEventListener('submit', handleSaveGoal);

    // Gastos Fixos
    document.getElementById('btn-add-fixed').addEventListener('click', toggleFixedForm);
    document.getElementById('btn-cancel-fixed').addEventListener('click', toggleFixedForm);
    document.getElementById('form-fixed').addEventListener('submit', handleAddFixedExpense);

    // Ações de Backup e Limpeza
    document.getElementById('btn-export').addEventListener('click', exportData);
    document.getElementById('input-import').addEventListener('change', importData);
    document.getElementById('btn-clear').addEventListener('click', clearData);
}

// ==========================================
// ATUALIZAÇÃO DA INTERFACE (UI)
// ==========================================
function updateUI() {
    populateMonthFilter();
    updateDashboard();
    updateMonthlySummary();
    updateGoalDisplay();
    updateTransactionList();
    updateFixedExpensesList();
    updatePresumedExpenses();
    updateCharts();
}

function updateDashboard() {
    let ganhos = 0;
    let gastos = 0;
    let pendentes = 0;

    state.transacoes.forEach(t => {
        if (t.tipo === 'ganho') {
            if (t.status === 'recebido') ganhos += t.valor;
            else pendentes += t.valor;
        } else if (t.tipo === 'gasto') {
            gastos += t.valor;
        }
    });

    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    state.gastosFixos.forEach(gf => {
        if (gf.status === 'pago' && gf.ultimoMesAtualizado === currentMonthStr) {
            gastos += gf.valor;
        }
    });

    const saldo = ganhos - gastos;

    document.getElementById('saldo-atual').textContent = formatCurrency(saldo);
    document.getElementById('total-ganhos').textContent = formatCurrency(ganhos);
    document.getElementById('total-gastos').textContent = formatCurrency(gastos);
    document.getElementById('total-pendentes').textContent = formatCurrency(pendentes);

    // Alerta de déficit
    const alertDeficit = document.getElementById('alert-deficit');
    if (gastos > ganhos && gastos > 0) {
        alertDeficit.classList.remove('hidden');
    } else {
        alertDeficit.classList.add('hidden');
    }
}

function updateMonthlySummary() {
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    let mesGanhos = 0;
    let mesGastos = 0;

    state.transacoes.forEach(t => {
        const txMonth = t.data.substring(0, 7); // yyyy-mm
        if (txMonth === currentMonthStr) {
            if (t.tipo === 'ganho' && t.status === 'recebido') mesGanhos += t.valor;
            if (t.tipo === 'gasto') mesGastos += t.valor;
        }
    });

    state.gastosFixos.forEach(gf => {
        if (gf.status === 'pago' && gf.ultimoMesAtualizado === currentMonthStr) {
            mesGastos += gf.valor;
        }
    });

    document.getElementById('mes-ganhos').textContent = formatCurrency(mesGanhos);
    document.getElementById('mes-gastos').textContent = formatCurrency(mesGastos);
    
    const lucro = mesGanhos - mesGastos;
    const lucroEl = document.getElementById('mes-lucro');
    lucroEl.textContent = formatCurrency(lucro);
    
    lucroEl.className = 'font-bold';
    if (lucro > 0) lucroEl.classList.add('text-success');
    else if (lucro < 0) lucroEl.classList.add('text-danger');
}

function updateGoalDisplay() {
    document.getElementById('goal-target').textContent = formatCurrency(state.meta);
    
    if (state.meta <= 0) {
        document.getElementById('goal-current').textContent = 'R$ 0,00';
        document.getElementById('goal-percent').textContent = '0%';
        document.getElementById('goal-progress').style.width = '0%';
        return;
    }

    // Calcula os gastos do mês atual para a meta
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    let gastosMes = 0;

    state.transacoes.forEach(t => {
        if (t.tipo === 'gasto' && t.data.substring(0, 7) === currentMonthStr) {
            gastosMes += t.valor;
        }
    });

    state.gastosFixos.forEach(gf => {
        if (gf.status === 'pago' && gf.ultimoMesAtualizado === currentMonthStr) {
            gastosMes += gf.valor;
        }
    });

    document.getElementById('goal-current').textContent = formatCurrency(gastosMes);
    
    let percent = (gastosMes / state.meta) * 100;
    let displayPercent = Math.min(percent, 100).toFixed(1);
    
    document.getElementById('goal-percent').textContent = `${displayPercent}%`;
    
    const progressEl = document.getElementById('goal-progress');
    progressEl.style.width = `${Math.min(percent, 100)}%`;
    
    if (percent > 100) {
        progressEl.classList.add('danger');
        document.getElementById('goal-percent').classList.add('text-danger');
    } else {
        progressEl.classList.remove('danger');
        document.getElementById('goal-percent').classList.remove('text-danger');
    }
}

function updateTransactionList() {
    const container = document.getElementById('list-container');
    container.innerHTML = '';

    const filterMes = document.getElementById('filter-mes').value;
    const filterTipo = document.getElementById('filter-tipo').value;
    const filterConta = document.getElementById('filter-conta').value;

    let filtered = state.transacoes.filter(t => {
        const txMonth = t.data.substring(0, 7);
        const passMes = filterMes === 'todos' || txMonth === filterMes;
        const passTipo = filterTipo === 'todos' || t.tipo === filterTipo;
        const passConta = filterConta === 'todas' || t.conta === filterConta;
        return passMes && passTipo && passConta;
    });

    // Ordenar da mais recente para mais antiga
    filtered.sort((a, b) => new Date(b.data) - new Date(a.data));

    if (filtered.length === 0) {
        container.innerHTML = '<p class="empty-state">Nenhuma transação encontrada com os filtros atuais.</p>';
        return;
    }

    filtered.forEach(t => {
        const div = document.createElement('div');
        const isGasto = t.tipo === 'gasto';
        const colorClass = isGasto ? 'text-danger' : (t.status === 'pendente' ? 'text-warning' : 'text-success');
        const sign = isGasto ? '- ' : '+ ';
        
        div.className = `transaction-item ${t.tipo} ${t.status || ''}`;
        
        // Formatando a data
        const dateObj = new Date(t.data);
        const dateStr = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

        div.innerHTML = `
            <div class="tx-info">
                <span class="tx-desc">${t.descricao}</span>
                <div class="tx-meta">
                    <span>${t.categoria}</span>
                    <span>${t.conta}</span>
                    <span>${t.pagamento}</span>
                    ${t.tipo === 'ganho' ? `<span>${t.status === 'recebido' ? '✅ Recebido' : '⏳ Pendente'}</span>` : ''}
                </div>
            </div>
            <div class="tx-right">
                <div style="text-align: right;">
                    <span class="tx-value ${colorClass}">${sign}${formatCurrency(t.valor)}</span>
                    <span class="tx-date">${dateStr}</span>
                </div>
                <button class="btn-icon danger" onclick="deleteTransaction('${t.id}')" title="Excluir">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                </button>
            </div>
        `;
        container.appendChild(div);
    });
}

function populateMonthFilter() {
    const select = document.getElementById('filter-mes');
    const currentValue = select.value;
    
    // Pega meses únicos
    const months = new Set();
    state.transacoes.forEach(t => {
        months.add(t.data.substring(0, 7)); // yyyy-mm
    });

    // Adiciona o mês atual se não existir
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    months.add(currentMonthStr);

    // Ordenar decrescente
    const sortedMonths = Array.from(months).sort().reverse();

    select.innerHTML = '<option value="todos">Todos os Meses</option>';
    
    sortedMonths.forEach(m => {
        const [year, month] = m.split('-');
        const date = new Date(year, month - 1);
        const name = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        const option = document.createElement('option');
        option.value = m;
        // Capitalizar primeira letra
        option.textContent = name.charAt(0).toUpperCase() + name.slice(1);
        select.appendChild(option);
    });

    if (sortedMonths.includes(currentValue)) {
        select.value = currentValue;
    }
}

// ==========================================
// AÇÕES E LÓGICA DE NEGÓCIO
// ==========================================
function handleAddTransaction(e) {
    e.preventDefault();

    const desc = document.getElementById('desc').value.trim();
    const valor = parseFloat(document.getElementById('valor').value);
    const tipo = document.getElementById('tipo').value;
    const status = document.getElementById('status').value;
    const categoria = document.getElementById('categoria').value;
    const conta = document.getElementById('conta').value;
    const pagamento = document.getElementById('pagamento').value;

    if (!desc || isNaN(valor) || valor <= 0) {
        showToast('Preencha os campos corretamente.', 'error');
        return;
    }

    const novaTransacao = {
        id: generateID(),
        descricao: desc,
        valor: valor,
        tipo: tipo,
        status: tipo === 'gasto' ? null : status, // Gasto não tem status no layout definido
        categoria: categoria,
        conta: conta,
        pagamento: pagamento,
        data: new Date().toISOString()
    };

    state.transacoes.push(novaTransacao);
    saveData();
    
    document.getElementById('form-transaction').reset();
    // Forçar trigger do select de tipo para resetar visual do status
    document.getElementById('tipo').dispatchEvent(new Event('change'));
    
    showToast('Transação adicionada com sucesso!', 'success');
}

window.deleteTransaction = function(id) {
    // Confirmação visual em vez de alert simples
    const confirmed = confirm('Tem certeza que deseja excluir esta transação?');
    if (confirmed) {
        state.transacoes = state.transacoes.filter(t => t.id !== id);
        saveData();
        showToast('Transação excluída.', 'success');
    }
};

function toggleGoalEdit() {
    const display = document.getElementById('goal-display');
    const form = document.getElementById('goal-edit-form');
    
    if (form.classList.contains('hidden')) {
        display.classList.add('hidden');
        form.classList.remove('hidden');
        document.getElementById('input-goal').value = state.meta > 0 ? state.meta : '';
        document.getElementById('input-goal').focus();
    } else {
        display.classList.remove('hidden');
        form.classList.add('hidden');
    }
}

function handleSaveGoal(e) {
    e.preventDefault();
    const valor = parseFloat(document.getElementById('input-goal').value);
    
    if (isNaN(valor) || valor < 0) {
        showToast('Valor inválido para a meta.', 'error');
        return;
    }
    
    state.meta = valor;
    saveData();
    toggleGoalEdit();
    showToast('Meta atualizada!', 'success');
}

// ==========================================
// IMPORTAR / EXPORTAR / LIMPAR
// ==========================================
function exportData() {
    if (state.transacoes.length === 0 && state.meta === 0) {
        showToast('Não há dados para exportar.', 'warning');
        return;
    }

    const dataStr = JSON.stringify(state, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'financeiro-backup.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('Backup exportado com sucesso!', 'success');
}

function importData(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            const parsed = JSON.parse(event.target.result);
            
            // Validação básica da estrutura
            if (!parsed.hasOwnProperty('transacoes') || !Array.isArray(parsed.transacoes)) {
                throw new Error('Formato de arquivo inválido. Faltando array de transacoes.');
            }
            
            state.transacoes = parsed.transacoes;
            state.meta = typeof parsed.meta === 'number' ? parsed.meta : 0;
            state.gastosFixos = Array.isArray(parsed.gastosFixos) ? parsed.gastosFixos : [];
            checkNewMonthFixedExpenses();
            
            saveData();
            showToast('Dados importados com sucesso!', 'success');
        } catch (error) {
            console.error(error);
            showToast('Erro ao importar arquivo. Verifique se é um JSON válido.', 'error');
        }
        // Limpa o input para permitir importar o mesmo arquivo novamente
        e.target.value = '';
    };
    reader.readAsText(file);
}

function clearData() {
    if (state.transacoes.length === 0) {
        showToast('O sistema já está vazio.', 'warning');
        return;
    }

    if (confirm('ATENÇÃO: Tem certeza que deseja apagar TODOS os seus dados? Esta ação não pode ser desfeita.')) {
        state = { transacoes: [], meta: 0, gastosFixos: [] };
        saveData();
        showToast('Todos os dados foram apagados.', 'success');
    }
}

// ==========================================
// SISTEMA DE GASTOS FIXOS
// ==========================================
function toggleFixedForm() {
    const formContainer = document.getElementById('fixed-form-container');
    if (formContainer.classList.contains('hidden')) {
        formContainer.classList.remove('hidden');
        document.getElementById('fixed-nome').focus();
    } else {
        formContainer.classList.add('hidden');
        document.getElementById('form-fixed').reset();
    }
}

function handleAddFixedExpense(e) {
    e.preventDefault();
    const nome = document.getElementById('fixed-nome').value.trim();
    const valor = parseFloat(document.getElementById('fixed-valor').value);
    const categoria = document.getElementById('fixed-categoria').value;
    const vencimentoStr = document.getElementById('fixed-vencimento').value;
    const vencimento = vencimentoStr ? vencimentoStr : null;

    if (!nome || isNaN(valor) || valor <= 0) {
        showToast('Preencha os campos corretamente.', 'error');
        return;
    }

    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const novoGastoFixo = {
        id: generateID(),
        nome: nome,
        valor: valor,
        categoria: categoria,
        vencimento: vencimento,
        status: 'pendente',
        ultimoMesAtualizado: currentMonthStr
    };

    state.gastosFixos.push(novoGastoFixo);
    saveData();
    toggleFixedForm();
    showToast('Gasto fixo adicionado!', 'success');
}

window.deleteFixedExpense = function(id) {
    if (confirm('Tem certeza que deseja excluir este gasto fixo?')) {
        state.gastosFixos = state.gastosFixos.filter(g => g.id !== id);
        saveData();
        showToast('Gasto fixo excluído.', 'success');
    }
};

window.toggleFixedStatus = function(id) {
    const gasto = state.gastosFixos.find(g => g.id === id);
    if (gasto) {
        gasto.status = gasto.status === 'pendente' ? 'pago' : 'pendente';
        
        const now = new Date();
        const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        gasto.ultimoMesAtualizado = currentMonthStr;
        
        saveData();
        if (gasto.status === 'pago') {
            showToast('Gasto marcado como pago!', 'success');
        } else {
            showToast('Gasto marcado como pendente!', 'warning');
        }
    }
};

function updateFixedExpensesList() {
    const container = document.getElementById('fixed-list-container');
    if (!container) return;
    container.innerHTML = '';

    if (!state.gastosFixos || state.gastosFixos.length === 0) {
        container.innerHTML = '<p class="empty-state">Nenhum gasto fixo cadastrado.</p>';
        return;
    }

    state.gastosFixos.forEach(g => {
        const div = document.createElement('div');
        div.className = `fixed-card ${g.status}`;
        
        const vencimentoText = g.vencimento ? `Vence dia ${g.vencimento}` : 'Sem dia fixo';
        const statusText = g.status === 'pago' ? 'Pago' : 'Pendente';
        
        div.innerHTML = `
            <div class="fixed-info">
                <span class="fixed-nome">${g.nome}</span>
                <div class="fixed-meta">
                    <span>${g.categoria}</span>
                    <span>${vencimentoText}</span>
                </div>
            </div>
            <div class="fixed-actions">
                <span class="fixed-value">${formatCurrency(g.valor)}</span>
                <button class="btn-toggle-status ${g.status}" onclick="toggleFixedStatus('${g.id}')">
                    ${statusText}
                </button>
                <button class="btn-icon danger" onclick="deleteFixedExpense('${g.id}')" title="Excluir">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
            </div>
        `;
        container.appendChild(div);
    });
}

// ==========================================
// SISTEMA DE GASTOS PRESUMIDOS
// ==========================================
function updatePresumedExpenses() {
    const container = document.getElementById('presumed-list-container');
    const totalValueEl = document.getElementById('presumed-total-value');
    if (!container) return;
    
    container.innerHTML = '';
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const monthsToConsider = [];
    for (let i = 1; i <= 3; i++) {
        let d = new Date(currentYear, currentMonth - i, 1);
        monthsToConsider.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    const categoriesSum = {};
    const categoriesCount = {};

    state.transacoes.forEach(t => {
        if (t.tipo === 'gasto') {
            const txMonth = t.data.substring(0, 7);
            if (monthsToConsider.includes(txMonth)) {
                if (!categoriesSum[t.categoria]) {
                    categoriesSum[t.categoria] = 0;
                    categoriesCount[t.categoria] = new Set();
                }
                categoriesSum[t.categoria] += t.valor;
                categoriesCount[t.categoria].add(txMonth);
            }
        }
    });
    
    let presumedTotal = 0;
    const categoriesList = [];

    let totalMonthsWithAnyData = 0;
    monthsToConsider.forEach(m => {
        if (state.transacoes.some(tx => tx.data.substring(0, 7) === m)) {
            totalMonthsWithAnyData++;
        }
    });

    for (let cat in categoriesSum) {
        let div = totalMonthsWithAnyData > 0 ? totalMonthsWithAnyData : 1;
        let average = categoriesSum[cat] / div;
        
        presumedTotal += average;
        categoriesList.push({ category: cat, average: average });
    }

    if (categoriesList.length === 0) {
        container.innerHTML = '<p class="empty-state">Sem histórico suficiente nos últimos 3 meses.</p>';
        totalValueEl.textContent = 'R$ 0,00';
        return;
    }

    categoriesList.sort((a, b) => b.average - a.average);

    categoriesList.forEach(item => {
        const div = document.createElement('div');
        div.className = 'presumed-card';
        div.innerHTML = `
            <span class="presumed-category">${item.category}</span>
            <span class="presumed-value">${formatCurrency(item.average)}</span>
        `;
        container.appendChild(div);
    });

    totalValueEl.textContent = formatCurrency(presumedTotal);
}

// ==========================================
// SISTEMA DE GRÁFICOS (CANVAS)
// ==========================================
function updateCharts() {
    const analysisNoData = document.getElementById('analysis-no-data');
    const analysisContent = document.getElementById('analysis-content');
    if (!analysisNoData || !analysisContent) return;
    
    const hasData = state.transacoes.length > 0 || (state.gastosFixos && state.gastosFixos.some(g => g.status === 'pago'));
    
    if (!hasData) {
        analysisNoData.classList.remove('hidden');
        analysisContent.classList.add('hidden');
        return;
    }
    
    analysisNoData.classList.add('hidden');
    analysisContent.classList.remove('hidden');
    
    setTimeout(() => {
        drawColumnChart();
        drawPieChart();
    }, 50);
}

function drawColumnChart() {
    const canvas = document.getElementById('chart-columns');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Adaptar tamanho do canvas
    const container = canvas.parentElement;
    canvas.width = container.clientWidth;
    canvas.height = 250;
    
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);
    
    const monthsSet = new Set();
    state.transacoes.forEach(t => monthsSet.add(t.data.substring(0, 7)));
    
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    monthsSet.add(currentMonthStr);
    
    const sortedMonths = Array.from(monthsSet).sort().slice(-6);
    
    const chartData = [];
    let maxAbsValue = 0;
    
    sortedMonths.forEach(m => {
        let ganhos = 0;
        let gastos = 0;
        
        state.transacoes.forEach(t => {
            if (t.data.substring(0, 7) === m) {
                if (t.tipo === 'ganho' && t.status === 'recebido') ganhos += t.valor;
                if (t.tipo === 'gasto') gastos += t.valor;
            }
        });
        
        if (m === currentMonthStr) {
            state.gastosFixos.forEach(gf => {
                if (gf.status === 'pago' && gf.ultimoMesAtualizado === currentMonthStr) {
                    gastos += gf.valor;
                }
            });
        }
        
        const resultado = ganhos - gastos;
        chartData.push({ month: m, value: resultado });
        
        if (Math.abs(resultado) > maxAbsValue) {
            maxAbsValue = Math.abs(resultado);
        }
    });
    
    if (maxAbsValue === 0) maxAbsValue = 100;
    
    const padding = 30;
    const bottomPadding = 40;
    const chartHeight = height - padding - bottomPadding;
    const zeroY = padding + chartHeight / 2;
    
    ctx.beginPath();
    ctx.moveTo(padding, zeroY);
    ctx.lineTo(width - padding, zeroY);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    const spaceForBars = width - padding * 2;
    const spacing = spaceForBars / sortedMonths.length;
    const barWidth = Math.min(40, spacing * 0.6);
    
    chartData.forEach((d, i) => {
        const x = padding + (i * spacing) + (spacing / 2) - (barWidth / 2);
        
        const barH = (Math.abs(d.value) / maxAbsValue) * (chartHeight / 2 - 10);
        
        ctx.fillStyle = d.value >= 0 ? '#10b981' : '#ef4444';
        
        if (d.value >= 0) {
            ctx.fillRect(x, zeroY - barH, barWidth, barH);
        } else {
            ctx.fillRect(x, zeroY, barWidth, barH);
        }
        
        const [year, month] = d.month.split('-');
        const dateObj = new Date(year, month - 1);
        const monthName = dateObj.toLocaleDateString('pt-BR', { month: 'short' });
        
        ctx.fillStyle = '#94a3b8';
        ctx.font = '12px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(monthName.charAt(0).toUpperCase() + monthName.slice(1), x + barWidth / 2, height - 10);
        
        ctx.fillStyle = d.value >= 0 ? '#10b981' : '#ef4444';
        ctx.font = '10px Inter, sans-serif';
        
        let shortVal = Math.abs(d.value);
        if (shortVal >= 1000) {
            shortVal = (shortVal / 1000).toFixed(1).replace('.0', '') + 'k';
        } else {
            shortVal = shortVal.toFixed(0);
        }
        
        if (d.value >= 0) {
            ctx.fillText('+' + shortVal, x + barWidth / 2, zeroY - barH - 5);
        } else {
            ctx.fillText('-' + shortVal, x + barWidth / 2, zeroY + barH + 12);
        }
    });
}

function drawPieChart() {
    const canvas = document.getElementById('chart-pie');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);
    
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    const categoriesSum = {};
    let totalGastos = 0;
    
    state.transacoes.forEach(t => {
        if (t.tipo === 'gasto' && t.data.substring(0, 7) === currentMonthStr) {
            categoriesSum[t.categoria] = (categoriesSum[t.categoria] || 0) + t.valor;
            totalGastos += t.valor;
        }
    });
    
    state.gastosFixos.forEach(gf => {
        if (gf.status === 'pago' && gf.ultimoMesAtualizado === currentMonthStr) {
            categoriesSum[gf.categoria] = (categoriesSum[gf.categoria] || 0) + gf.valor;
            totalGastos += gf.valor;
        }
    });
    
    let ganhos = 0;
    state.transacoes.forEach(t => {
        if (t.tipo === 'ganho' && t.status === 'recebido' && t.data.substring(0, 7) === currentMonthStr) {
            ganhos += t.valor;
        }
    });
    
    const saldo = ganhos - totalGastos;
    const centerValueEl = document.querySelector('#pie-center-value .value');
    if (centerValueEl) {
        centerValueEl.textContent = formatCurrency(Math.abs(saldo));
        
        if (saldo >= 0) {
            centerValueEl.textContent = '+' + centerValueEl.textContent;
            centerValueEl.style.color = 'var(--success)';
        } else {
            centerValueEl.textContent = '-' + centerValueEl.textContent;
            centerValueEl.style.color = 'var(--danger)';
        }
    }
    
    if (totalGastos === 0) {
        ctx.beginPath();
        ctx.arc(width/2, height/2, Math.min(width, height)/2 - 10, 0, 2 * Math.PI);
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 15;
        ctx.stroke();
        document.getElementById('pie-legend').innerHTML = '';
        return;
    }
    
    const colors = {
        'Alimentação': '#f59e0b',
        'Assinaturas': '#8b5cf6',
        'Transporte': '#3b82f6',
        'Investimento': '#10b981',
        'Outros': '#64748b',
        'Salário': '#10b981'
    };
    
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 10;
    
    let startAngle = -Math.PI / 2;
    
    const legendContainer = document.getElementById('pie-legend');
    if (legendContainer) legendContainer.innerHTML = '';
    
    for (let cat in categoriesSum) {
        const value = categoriesSum[cat];
        if (value === 0) continue;
        
        const sliceAngle = (value / totalGastos) * 2 * Math.PI;
        const color = colors[cat] || '#cbd5e1';
        
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
        ctx.closePath();
        
        ctx.fillStyle = color;
        ctx.fill();
        
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#1e293b';
        ctx.stroke();
        
        startAngle += sliceAngle;
        
        if (legendContainer) {
            const percent = ((value / totalGastos) * 100).toFixed(1);
            legendContainer.innerHTML += `
                <div class="legend-item">
                    <div class="legend-color" style="background-color: ${color}"></div>
                    <span>${cat} (${percent}%)</span>
                </div>
            `;
        }
    }
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.65, 0, 2 * Math.PI);
    ctx.fillStyle = '#1e293b';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#1e293b';
    ctx.stroke();
}

// ==========================================
// UTILITÁRIOS
// ==========================================
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

function generateID() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // Ícones para o toast
    let icon = '';
    if (type === 'success') {
        icon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
    } else if (type === 'error') {
        icon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
    } else {
        icon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';
    }
    
    toast.innerHTML = `${icon} <span>${message}</span>`;
    container.appendChild(toast);
    
    // Força reflow para animação
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // Remove após 3 segundos
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            container.removeChild(toast);
        }, 300); // tempo da transição css
    }, 3000);
}
