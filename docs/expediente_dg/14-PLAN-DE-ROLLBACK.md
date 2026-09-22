# PLAN DE CONTINGENCIA Y ROLLBACK

## 1. Gatillo de Rollback
Falla catastrofica de disponibilidad (>30 min), perdida de integridad en cobros o inconsistencias en historias clinicas durante el primer dia de piloto.

## 2. Pasos Inmediatos
1. Retorno a boletas fisicas de contingencia y fichas manuales de contingencia.
2. Redireccion de DNS o pausa de Vercel Deployment al commit previo estable.
3. Exportacion inmediata del delta de atenciones registradas durante la ventana del piloto.
