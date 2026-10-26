/** ¿Un golpe que no se guardó se vuelve a intentar? Sí, salvo que el servidor lo rechace por el dato o el permiso:
 *  sin señal (null), sesión vencida, timeout, límite o falla del servidor no deben perder lo anotado. */
export const reintentar = (status: number | null) =>
  status == null || status === 401 || status === 408 || status === 429 || status >= 500
