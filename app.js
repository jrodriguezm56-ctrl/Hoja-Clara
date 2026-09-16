const $ = el => document.querySelector(el)
const $$ = el => document.querySelectorAll(el)

const ROWS = 26
const COLUMNS = 26
const FIRST_CHAR_CODE = 65

const times = length => Array.from({ length }, (_, i) => i)
const getColumn = i => String.fromCharCode(FIRST_CHAR_CODE + i)

// Cargar estado inicial desde localStorage o crear matriz limpia
const loadInitialState = () => {
    const saved = localStorage.getItem('hoja_clara_state')
    if (saved) {
        try { return JSON.parse(saved) } catch (e) {}
    }
    return times(COLUMNS).map(() => times(ROWS).map(() => ({ computedValue: '', value: '' })))
}

let STATE = loadInitialState()

// --- SISTEMA DE HISTORIAL (DESHACER / REHACER) ---

const undoStack = []
const redoStack = []
const MAX_HISTORY = 30

function saveHistory() {
    if (undoStack.length >= MAX_HISTORY) undoStack.shift()
    undoStack.push(structuredClone(STATE))
    redoStack.length = 0
}

function undo() {
    if (undoStack.length === 0) return
    redoStack.push(structuredClone(STATE))
    STATE = undoStack.pop()
    computedAllCells(STATE)
    localStorage.setItem('hoja_clara_state', JSON.stringify(STATE))
    renderSpreadSheet()
}

function redo() {
    if (redoStack.length === 0) return
    undoStack.push(structuredClone(STATE))
    STATE = redoStack.pop()
    computedAllCells(STATE)
    localStorage.setItem('hoja_clara_state', JSON.stringify(STATE))
    renderSpreadSheet()
}

document.addEventListener('keydown', (event) => {
    if (event.target.tagName === 'INPUT') return

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        if (event.shiftKey) {
            redo()
        } else {
            undo()
        }
        event.preventDefault()
    } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
        redo()
        event.preventDefault()
    }
})

// --- ARRASTRE DE FÓRMULAS CON REFERENCIAS RELATIVAS ---

function shiftFormulaReferences(formula, deltaX, deltaY) {
    if (typeof formula !== 'string' || !formula.startsWith('=')) return formula

    return formula.replace(/([A-Z]+)(\d+)/g, (match, colStr, rowStr) => {
        let colIndex = colStr.charCodeAt(0) - FIRST_CHAR_CODE + deltaX
        let rowIndex = parseInt(rowStr) + deltaY

        if (colIndex < 0) colIndex = 0
        if (colIndex >= COLUMNS) colIndex = COLUMNS - 1
        if (rowIndex < 1) rowIndex = 1
        if (rowIndex > ROWS) rowIndex = ROWS

        const newColStr = String.fromCharCode(FIRST_CHAR_CODE + colIndex)
        return `${newColStr}${rowIndex}`
    })
}

function copyCellRange(sourceX, sourceY, targetX, targetY) {
    saveHistory()
    const newstate = structuredClone(STATE)
    const sourceValue = newstate[sourceX][sourceY].value

    const deltaX = targetX - sourceX
    const deltaY = targetY - sourceY

    const adjustedValue = typeof sourceValue === 'string' && sourceValue.startsWith('=')
        ? shiftFormulaReferences(sourceValue, deltaX, deltaY)
        : sourceValue

    newstate[targetX][targetY].value = adjustedValue

    computedAllCells(newstate)
    STATE = newstate
    localStorage.setItem('hoja_clara_state', JSON.stringify(STATE))
    renderSpreadSheet()
}

// --- PARSER Y EXPANSOR DE RANGOS ---

function expandRanges(formula, state) {
    const rangeRegex = /(SUMA|PROMEDIO|MAX|MIN)\(([A-Z]+\d+):([A-Z]+\d+)\)/gi
    return formula.replace(rangeRegex, (match, fn, startCell, endCell) => {
        const startCol = startCell.match(/[A-Z]+/)[0].charCodeAt(0) - FIRST_CHAR_CODE
        const startRow = parseInt(startCell.match(/\d+/)[0]) - 1
        const endCol = endCell.match(/[A-Z]+/)[0].charCodeAt(0) - FIRST_CHAR_CODE
        const endRow = parseInt(endCell.match(/\d+/)[0]) - 1

        const values = []
        for (let c = Math.min(startCol, endCol); c <= Math.max(startCol, endCol); c++) {
            for (let r = Math.min(startRow, endRow); r <= Math.max(startRow, endRow); r++) {
                if (state[c] && state[c][r] !== undefined) {
                    const val = parseFloat(state[c][r].computedValue)
                    values.push(isNaN(val) ? 0 : val)
                }
            }
        }

        if (values.length === 0) return '0'

        switch (fn.toUpperCase()) {
            case 'SUMA': return `(${values.join('+')})`
            case 'PROMEDIO': return `((${values.join('+')})/${values.length})`
            case 'MAX': return `(${Math.max(...values)})`
            case 'MIN': return `(${Math.min(...values)})`
            default: return '0'
        }
    })
}

// --- EVALUADOR CON PILAS (SIN EVAL) ---

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

        if (a === undefined || b === undefined) throw new Error("#ERROR!")

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
            while (ops.length && ops[ops.length - 1] !== '(') applyOp()
            ops.pop()
        } else if (['+', '-', '*', '/'].includes(token)) {
            while (ops.length && precedence[ops[ops.length - 1]] >= precedence[token]) applyOp()
            ops.push(token)
        }
    }

    while (ops.length) applyOp()
    return values.length === 1 ? values[0] : '#ERROR!'
}

function computedValue(value, state) {
    if (typeof value === 'number') return value
    if (typeof value === 'string' && !value.startsWith('=')) return value

    let formula = value.slice(1).toUpperCase()
    try {
        formula = expandRanges(formula, state)
        const tokens = tokenize(formula)
        return evaluateExpression(tokens, state)
    } catch (e) {
        return e.message.startsWith('#') ? e.message : `#ERROR!`
    }
}

// --- DETECCIÓN DE REFERENCIAS CIRCULARES ---

function hasCircularReference(col, row, state, visited = new Set()) {
    const cellId = `${getColumn(col)}${row + 1}`
    if (visited.has(cellId)) return true

    visited.add(cellId)
    const rawValue = state[col][row].value

    if (typeof rawValue === 'string' && rawValue.startsWith('=')) {
        const refs = rawValue.match(/[A-Z]+\d+/g) || []
        for (let ref of refs) {
            const c = ref.match(/[A-Z]+/)[0].charCodeAt(0) - FIRST_CHAR_CODE
            const r = parseInt(ref.match(/\d+/)[0]) - 1

            if (state[c] && state[c][r] !== undefined) {
                if (hasCircularReference(c, r, state, new Set(visited))) return true
            }
        }
    }
    return false
}

function computedAllCells(cells) {
    cells.forEach((rows, x) => {
        rows.forEach((cell, y) => {
            if (hasCircularReference(x, y, cells)) {
                cell.computedValue = '#CIRCULAR!'
            } else {
                cell.computedValue = computedValue(cell.value, cells)
            }
        })
    })
}

function updateCell({ x, y, value }) {
    saveHistory()
    const newstate = structuredClone(STATE)
    newstate[x][y].value = value

    computedAllCells(newstate)
    STATE = newstate

    localStorage.setItem('hoja_clara_state', JSON.stringify(STATE))
    renderSpreadSheet()
}

// --- RENDERIZADO ---

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
            ${times(COLUMNS).map(column => {
                const cell = STATE[column][row]
                const val = cell.computedValue
                
                let cellClass = ''
                if (typeof val === 'number' && val < 0) cellClass = 'is-negative'
                if (typeof val === 'string' && val.startsWith('#')) cellClass = 'is-error'

                return `
                <td data-x="${column}" data-y="${row}" class="${cellClass}">
                    <span>${val}</span>
                    <input type="text" value="${cell.value}" />
                    <div class="fill-handle" data-x="${column}" data-y="${row}"></div>
                </td>`
            }).join('')}
        </tr>`
    }).join('')

    $body.innerHTML = bodyHTML
}

// --- PERSISTENCIA Y EXPORTACIÓN ---

$('#btn-save').addEventListener('click', () => {
    localStorage.setItem('hoja_clara_state', JSON.stringify(STATE))
    alert('¡Hoja guardada con éxito!')
})

$('#btn-clear').addEventListener('click', () => {
    if (confirm('¿Deseas borrar el contenido de la hoja?')) {
        saveHistory()
        localStorage.removeItem('hoja_clara_state')
        STATE = times(COLUMNS).map(() => times(ROWS).map(() => ({ computedValue: '', value: '' })))
        renderSpreadSheet()
    }
})

$('#btn-export').addEventListener('click', () => {
    let csvContent = "data:text/csv;charset=utf-8,"
    
    csvContent += ";" + times(COLUMNS).map(i => getColumn(i)).join(";") + "\n"
    
    for (let r = 0; r < ROWS; r++) {
        let rowStr = (r + 1) + ";"
        for (let c = 0; c < COLUMNS; c++) {
            rowStr += STATE[c][r].computedValue + ";"
        }
        csvContent += rowStr + "\n"
    }

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", "hoja_clara_export.csv")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
})

// --- EVENTOS Y DRAG & DROP ---

let dragSource = null

const $body = $('tbody')

$body.addEventListener('mousedown', event => {
    if (event.target.classList.contains('fill-handle')) {
        const td = event.target.closest('td')
        const { x, y } = td.dataset
        dragSource = { x: parseInt(x), y: parseInt(y) }
        event.stopPropagation()
    }
})

$body.addEventListener('mouseup', event => {
    if (dragSource) {
        const td = event.target.closest('td')
        if (td) {
            const { x, y } = td.dataset
            const targetX = parseInt(x)
            const targetY = parseInt(y)

            if (dragSource.x !== targetX || dragSource.y !== targetY) {
                copyCellRange(dragSource.x, dragSource.y, targetX, targetY)
            }
        }
        dragSource = null
    }
})

$body.addEventListener('click', event => {
    if (event.target.classList.contains('fill-handle')) return
    
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
        updateCell({ x: parseInt(x), y: parseInt(y), value: input.value })
    }, { once: true })
})

computedAllCells(STATE)
renderSpreadSheet()