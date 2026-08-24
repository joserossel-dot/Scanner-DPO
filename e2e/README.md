# Prueba E2E de staging

La prueba crea una empresa sintética única y valida, por API, el flujo de registro, login fresco, sesión autorizada, escritura y lectura de un riesgo, escaneo y persistencia del último escaneo.

Debe apuntar únicamente a un ambiente aislado de pruebas o staging. Cada ejecución conserva los registros sintéticos para no depender de endpoints destructivos ni de permisos administrativos.

```bash
npm ci --prefix e2e
E2E_API_URL=https://api-staging.example.com npm test --prefix e2e
```

Variables:

- `E2E_API_URL`: obligatoria. URL base de la API aislada.
- `E2E_SCAN_TARGET`: opcional. Por defecto `https://example.com`.

La prueba genera la contraseña y el token en memoria. No requiere secretos versionados.
