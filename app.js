const $ = el => document.querySelector(el)
const $$ = el => document.querySelectorAll(el)

const ROWS = 10
const COLUMNS = 5
const FIRST_CHAR_CODE = 65

const times = length => Array.from({ length }, (_, i) => i)
const getColumn = i => String.fromCharCode(FIRST_CHAR_CODE + i)

let STATE = times(COLUMNS).map(() => times(ROWS).map(() => ({ computedValue: '', value: '' })))

// --- TOKENIZADOR Y EVALUADOR CON PILAS (SIN EVAL) ---

function tokenize(formula) {
    const regex = /([A-Z]+\d+|[0-9]+(?:\.[0-9]+)?|[+\-*/()])/g
    return formula.match(regex) || []
}

function evaluateExpression(tokens, state) {
    const values = []
    const ops = []
    const precedence = { '+': 1, '-': 1, '*': 2, '/': 2 }

    const applyOp = () => {
        const b = values.pop()
        const a = values.pop()
        const op = ops.pop()

        if (a === undefined || b === undefined) throw new Error("Expresión inválida")

        switch (op) {
            case '+': values.push(a + b); break
            case '-': values.push(a - b); break
            case '*': values.push(a * b); break
            case '/': 
                if (b === 0) throw new Error("#DIV/0!")
                values.push(a / b)
                break
        }
    }

    for (let token of tokens) {
        if (!isNaN(token)) {
            values.push(parseFloat(token))
        } else if (/^[A-Z]+\d+$/.test(token)) {
            const colLetter = token.match(/[A-Z]+/)[0]
            const rowNum = parseInt(token.match(/\d+/)[0]) - 1
            const colIndex = colLetter.charCodeAt(0) - FIRST_CHAR_CODE

            if (state[colIndex] && state[colIndex][rowNum] !== undefined) {
                const cellVal = parseFloat(state[colIndex][rowNum].computedValue)
                values.push(isNaN(cellVal) ? 0 : cellVal)
            } else {
                throw new Error("#REF!")
            }
        } else if (token === '(') {
            ops.push(token)
        } else if (token === ')') {
            while (ops.length && ops[ops.length - 1] !== '(') {
                applyOp()
            }
            ops.pop()
        } else if (['+', '-', '*', '/'].includes(token)) {
            while (
                ops.length && 
                precedence[ops[ops.length - 1]] >= precedence[token]
            ) {
                applyOp()
            }
            ops.push(token)
        }
    }

    while (ops.length) {
        applyOp()
    }

    return values.length === 1 ? values[0] : '#ERROR!'
}

function computedValue(value, state) {
    if (typeof value === 'number') return value
    if (typeof value === 'string' && !value.startsWith('=')) return value

    const formula = value.slice(1).toUpperCase()

    try {
        const tokens = tokenize(formula)
        return evaluateExpression(tokens, state)
    } catch (e) {
        return e.message.startsWith('#') ? e.message : `#ERROR!`
    }
}

function computedAllCells(cells) {
    cells.forEach((rows) => {
        rows.forEach((cell) => { 
            cell.computedValue = computedValue(cell.value, cells)
        })
    })
}

function updateCell({ x, y, value }) {
    const newstate = structuredClone(STATE)
    newstate[x][y].value = value

    computedAllCells(newstate)

    STATE = newstate
    renderSpreadSheet()
}

const renderSpreadSheet = () => {
    const $head = $('thead')
    const $body = $('tbody')

    const headerHTML = `<tr>
        <th></th>
        ${times(COLUMNS).map(i => `<th>${getColumn(i)}</th>`).join('')}
    </tr>`

    $head.innerHTML = headerHTML

    const bodyHTML = times(ROWS).map(row => {
        return `<tr>
            <td>${row + 1}</td>
            ${times(COLUMNS).map(column => `
            <td data-x="${column}" data-y="${row}">
                <span>${STATE[column][row].computedValue}</span>
                <input type="text" value="${STATE[column][row].value}" />
            </td>
        `).join('')}
    </tr>`
    }).join('')

    $body.innerHTML = bodyHTML
}

const $body = $('tbody')
$body.addEventListener('click', event => {
    const td = event.target.closest('td')
    if (!td) return

    const { x, y } = td.dataset
    const input = td.querySelector('input')

    const end = input.value.length
    input.setSelectionRange(end, end)
    input.focus()

    input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') input.blur()
    })

    input.addEventListener('blur', () => {
        if (input.value === STATE[x][y].value) return
        updateCell({ x, y, value: input.value })
    }, { once: true })
})

renderSpreadSheet()