Registro 1 
* **Fecha:** 1 de septiembre
  - inicio del proyecto hoy pude iniciar con el html para el programa de hojas de calculo.
  - Creación de la estructura HTML base y estilos CSS para la interfaz del libro de trabajo.
  - Implementación de la función `renderSpreadSheet()` para generar dinámicamente los encabezados y celdas de la tabla mediante manipulaciones del DOM y utilidades funcionales (`Array.from`)[cite: 1].
  - Vinculación de atributos de datos (`data-x` y `data-y`) en cada celda para facilitar la futura identificación de coordenadas en la matriz.
* **Problemas encontrados:**
  - Ajuste de estilos CSS para evitar que los campos de entrada (`<input>`) desconfiguren el tamaño de las celdas de la tabla HTML.
* **Decisiones de diseño:**
  - Se estructuró cada celda (`<td>`) con un par de elementos `<span>` e `<input>` superpuestos. Esto permitirá alternar entre la visualización del resultado evaluado y la edición del contenido/fórmula sin recrear elementos del DOM en tiempo de ejecución.

registro 2
* **Fecha:** 2 de septiembre de 2026
* **Avances:**
  - Implementación de la matriz bidimensional `STATE` para almacenar objetos de celdas con propiedades `value` y `computedValue`.
  - Creación de la función `updateCell` para actualizar de forma inmutable el estado mediante `structuredClone` y re-renderizar la interfaz en el DOM.
  - Agregado del manejo de eventos de teclado (`Enter`) y pérdida de foco (`blur`) en los inputs para confirmar la edición de los datos.
  - Implementación de la función `computedValue` como prototipo inicial para detectar entradas que inician con `=` y evaluar la expresión.
* **Problemas encontrados:**
  - Al editar valores, la vista no se actualizaba automáticamente. Se resolvió invocando `renderSpreadSheet()` despues de modificar la matriz `STATE`.
  - **Pendiente:** Reemplazar el motor de prueba actual (`eval()`) por un tokenizador y evaluador por pilas propio para cumplir con las restricciones obligatorias de la práctica. Min 58:34 

Registro 3
* **Fecha:** 3 de septiembre de 2026
* **Avances:**
  - Implementación de `generateCellsConstants()` para mapear las coordenadas de la matriz en identificadores tipo Excel (`A1`, `B2`).
  - Creación de la función `computedAllCells()` para actualizar en cadena el valor calculado de todas las celdas dependientes al modificar una celda origen.
* **Problemas encontrados:**
  - Colisión de nombres en la función `computedAllCells` al declarar una constante interna con el mismo nombre de la función de evaluación (`computedValue`). Se corrigió renombrando la variable local a `result`.
- **Pendiente:**  
  -Por el momento se sigue usando el (`eval()`) que debe ser cambiado.