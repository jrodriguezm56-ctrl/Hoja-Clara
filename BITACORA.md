Registro 1 - Fase 1
* **Fecha:** 1 de septiembre
  - inicio del proyecto hoy pude iniciar con el html para el programa de hojas de calculo.
  - Creación de la estructura HTML base y estilos CSS para la interfaz del libro de trabajo.
  - Implementación de la función `renderSpreadSheet()` para generar dinámicamente los encabezados y celdas de la tabla mediante manipulaciones del DOM y utilidades funcionales (`Array.from`)[cite: 1].
  - Vinculación de atributos de datos (`data-x` y `data-y`) en cada celda para facilitar la futura identificación de coordenadas en la matriz.
* **Problemas encontrados:**
  - Ajuste de estilos CSS para evitar que los campos de entrada (`<input>`) desconfiguren el tamaño de las celdas de la tabla HTML.
* **Decisiones de diseño:**
  - Se estructuró cada celda (`<td>`) con un par de elementos `<span>` e `<input>` superpuestos. Esto permitirá alternar entre la visualización del resultado evaluado y la edición del contenido/fórmula sin recrear elementos del DOM en tiempo de ejecución.


