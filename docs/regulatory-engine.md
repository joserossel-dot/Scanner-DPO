# Motor normativo versionado

## Objetivo

Evitar que artículos, sanciones, plazos, países, mecanismos contractuales y
criterios jurídicos queden distribuidos como texto fijo en servicios y vistas.

## Entidades mínimas

- `regulatory_source`: norma, jurisdicción, URL oficial y organismo.
- `regulatory_version`: publicación, vigencia, derogación y versión del texto.
- `regulatory_rule`: condición evaluable y alcance.
- `rule_evidence_requirement`: evidencia necesaria y calidad mínima.
- `legal_interpretation`: interpretación, supuestos, excepciones y revisor.
- `assessment`: aplicación de una versión de regla a un tratamiento.
- `assessment_decision`: estado preliminar, revisado, aprobado o descartado.

## Estados

```text
draft -> under_review -> approved -> effective -> superseded
```

Una regla no aprobada puede generar preguntas o advertencias internas, pero no
una conclusión presentada al cliente como incumplimiento.

## Contrato de salida

Todo resultado normativo debe incluir:

- identificador y versión de regla;
- hechos observados o declarados;
- evidencia utilizada;
- información faltante;
- supuestos aplicados;
- conclusión preliminar o aprobada;
- identidad y fecha de revisión;
- acciones recomendadas.
