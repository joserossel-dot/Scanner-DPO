export function evaluateQuestionnaire(answers) {
    const findings = [];
    const actionPlan = [];
    let scoreTotal = 100;
    let maxRiskUtm = 0;
    let stepCounter = 1;
    const complexWarning = " Requiere implementación técnica compleja. Se sugiere derivar a Consultor / Subcontratista especializado.";
    // Rule 1: TI Database Encryption (Art. 14 quinquies)
    if (answers.ti_encryption_type === 'Sin cifrar') {
        const penalty = 20;
        const riskUtm = 10000;
        scoreTotal -= penalty;
        if (riskUtm > maxRiskUtm)
            maxRiskUtm = riskUtm;
        findings.push({
            id: 'FIND_TI_ENCRYPTION',
            category: 'Ciberseguridad',
            severity: 'Grave',
            description: 'Infracción Grave (Art. 14 quinquies) - Bases de datos principales sin cifrado activo en reposo.',
            recommendation: 'Implementar mecanismos de cifrado AES-256 en reposo para todos los servidores y backups conteniendo datos personales.' + complexWarning,
            penalty,
            riskUtm,
            effort: 'HIGH'
        });
        actionPlan.push({
            step: stepCounter++,
            title: 'Implementar cifrado AES-256',
            description: 'Cifrar bases de datos y respaldos de TI en reposo (Art. 14 quinquies).' + complexWarning,
            priority: 'Alta',
            estimatedEffort: '4 horas',
            details: 'Habilitar el cifrado transparente de datos (TDE) en los proveedores cloud y discos locales.'
        });
    }
    // Rule 2: Biometría (Art. 16 ter)
    const isBiometricAttendance = Array.isArray(answers.rrhh_attendance_tech) &&
        (answers.rrhh_attendance_tech.includes('Huella') || answers.rrhh_attendance_tech.includes('Rostro/Iris'));
    if (isBiometricAttendance && (answers.rrhh_biometric_consent === 'No' || answers.rrhh_biometric_consent === 'En proceso')) {
        const penalty = 15;
        const riskUtm = 10000;
        scoreTotal -= penalty;
        if (riskUtm > maxRiskUtm)
            maxRiskUtm = riskUtm;
        findings.push({
            id: 'FIND_BIOMETRICS_UNCONSENTED',
            category: 'Recursos Humanos',
            severity: 'Grave',
            description: 'Infracción Grave (Art. 16 ter) - Control de asistencia mediante tecnologías biométricas sin consentimiento previo e informado del trabajador.',
            recommendation: 'Obtener la firma explícita e individual del consentimiento de biometría para todos los trabajadores enrolados en el sistema de control de acceso.',
            penalty,
            riskUtm,
            effort: 'MEDIUM'
        });
        actionPlan.push({
            step: stepCounter++,
            title: 'Implementar Anexo de Consentimiento Biométrico e Información Técnica',
            description: 'Regularizar el uso de tecnologías biométricas en el control de asistencia (Art. 16 ter).',
            priority: 'Alta',
            estimatedEffort: '2 horas',
            details: 'Generar la declaración de aviso de biometría y obtener la aceptación de los empleados antes del marcaje.'
        });
    }
    // Rule 3: Datos Sensibles sin Seguridad (Art. 14 quinquies y 16 bis)
    const hasSensitiveHealthData = Array.isArray(answers.rrhh_health_data) &&
        (answers.rrhh_health_data.includes('licencias') ||
            answers.rrhh_health_data.includes('examenes_ocup') ||
            answers.rrhh_health_data.includes('drogas'));
    if (hasSensitiveHealthData && answers.ti_encryption_type === 'Sin cifrar') {
        const penalty = 15;
        const riskUtm = 10000;
        scoreTotal -= penalty;
        if (riskUtm > maxRiskUtm)
            maxRiskUtm = riskUtm;
        findings.push({
            id: 'FIND_SENSITIVE_UNSECURE',
            category: 'Ciberseguridad',
            severity: 'Grave',
            description: 'Infracción Grave (Art. 14 quinquies y 16 bis) - Tratamiento de datos de salud y licencias médicas sin medidas de cifrado activas.',
            recommendation: 'Aplicar políticas de cifrado estricto (AES-256) sobre bases de datos de personal y repositorios con archivos de licencias médicas.' + complexWarning,
            penalty,
            riskUtm,
            effort: 'HIGH'
        });
        actionPlan.push({
            step: stepCounter++,
            title: 'Cifrar bases de datos de salud en reposo y tránsito (AES-256)',
            description: 'Asegurar la confidencialidad de datos sensibles y licencias de personal (Art. 16 bis).' + complexWarning,
            priority: 'Alta',
            estimatedEffort: '3 horas',
            details: 'Cifrar carpetas de red y bases de datos que almacenen certificados médicos, licencias y exámenes ocupacionales.'
        });
    }
    // Rule 4: Encargados sin Contrato (Art. 15 bis)
    const transfersDataToVendors = Array.isArray(answers.vendors_transfer_types) &&
        answers.vendors_transfer_types.length > 0 &&
        !answers.vendors_transfer_types.includes('none');
    if (transfersDataToVendors && (answers.vendors_dpa_contracts === 'Ninguno' || answers.vendors_dpa_contracts === 'Solo algunos')) {
        const penalty = 15;
        const riskUtm = 10000;
        scoreTotal -= penalty;
        if (riskUtm > maxRiskUtm)
            maxRiskUtm = riskUtm;
        findings.push({
            id: 'FIND_VENDORS_NO_DPA',
            category: 'Proveedores',
            severity: 'Grave',
            description: 'Infracción Grave (Art. 15 bis) - Transferencia de bases de datos a proveedores externos sin acuerdo contractual DPA.',
            recommendation: 'Establecer acuerdos de procesamiento de datos (DPA) con todos los encargados de tratamiento identificados.',
            penalty,
            riskUtm,
            effort: 'LOW'
        });
        actionPlan.push({
            step: stepCounter++,
            title: 'Firmar Acuerdos DPA con todos los proveedores externos mediante el Centro de Remedición',
            description: 'Regularizar la relación de tratamiento de datos con proveedores (Art. 15 bis).',
            priority: 'Alta',
            estimatedEffort: '2 días',
            details: 'Utilizar el generador de contratos para emitir el anexo DPA, enviándolo para firma de proveedores SaaS y agencias externas.'
        });
    }
    // Rule 5: Transferencia Internacional (TID) (Art. 27 y 28)
    const isForeignServerCountry = answers.commercial_server_country === 'EE.UU.' || answers.commercial_server_country === 'Otro';
    if (isForeignServerCountry && (answers.vendors_dpa_contracts === 'Ninguno' || answers.vendors_dpa_contracts === 'Solo algunos')) {
        const penalty = 25;
        const riskUtm = 20000;
        scoreTotal -= penalty;
        if (riskUtm > maxRiskUtm)
            maxRiskUtm = riskUtm;
        findings.push({
            id: 'FIND_TID_UNREGULATED',
            category: 'Transferencias_Internacionales',
            severity: 'Gravísima',
            description: 'Infracción Gravísima (Art. 27 y 28) - Transferencia transfronteriza de datos sin Cláusulas Contractuales Tipo (SCC).',
            recommendation: 'Implementar Cláusulas Contractuales Tipo (SCC) para regular la transferencia de datos a países que no cumplan con niveles adecuados de protección.',
            penalty,
            riskUtm,
            effort: 'MEDIUM'
        });
        actionPlan.push({
            step: stepCounter++,
            title: 'Generar y firmar Cláusulas Contractuales Tipo (SCC) con proveedores extranjeros',
            description: 'Regularizar las transferencias internacionales de datos (Art. 28).',
            priority: 'Alta',
            estimatedEffort: '3 días',
            details: 'Firmar e indexar Cláusulas Contractuales Tipo (SCC) con proveedores extranjeros cuyos servidores no residan en Chile o la Unión Europea.'
        });
    }
    // Rule 6: Prescribed debt deletion (Art. 17)
    if (answers.finances_debt_deletion === 'No se eliminan') {
        const penalty = 10;
        const riskUtm = 10000;
        scoreTotal -= penalty;
        if (riskUtm > maxRiskUtm)
            maxRiskUtm = riskUtm;
        findings.push({
            id: 'FIND_DEBT_RETENTION',
            category: 'Finanzas',
            severity: 'Grave',
            description: 'Infracción Grave (Art. 17) - Retención ilegal de datos de deudas ya prescriptas en bases de cobranza comercial.',
            recommendation: 'Implementar un procedimiento automático de depuración y olvido para deudas que hayan superado el plazo legal de prescripción.',
            penalty,
            riskUtm,
            effort: 'MEDIUM'
        });
        actionPlan.push({
            step: stepCounter++,
            title: 'Depurar deudas prescriptas',
            description: 'Implementar deudas financieras prescriptas (Art. 17).',
            priority: 'Media',
            estimatedEffort: '1 día',
            details: 'Ejecutar procesos automáticos de eliminación o anonimización de registros financieros según las reglas del Art. 17.'
        });
    }
    // Rule 7: Shadow IT sin DPA (Art. 15 bis)
    const hasShadowIt = Array.isArray(answers.shadow_it_providers) && answers.shadow_it_providers.length > 0;
    if (hasShadowIt && (answers.vendors_dpa_contracts === 'Ninguno' || answers.vendors_dpa_contracts === 'Solo algunos')) {
        const penalty = 15;
        const riskUtm = 10000;
        scoreTotal -= penalty;
        if (riskUtm > maxRiskUtm)
            maxRiskUtm = riskUtm;
        findings.push({
            id: 'FIND_SHADOW_IT_NO_DPA',
            category: 'Proveedores',
            severity: 'Grave',
            description: 'Infracción Grave (Art. 15 bis) - Uso de herramientas SaaS externas (Shadow IT) sin acuerdos contractuales de DPA.',
            recommendation: 'Establecer y regularizar acuerdos de procesamiento de datos (DPA) con todos los proveedores externos declarados.',
            penalty,
            riskUtm,
            effort: 'LOW'
        });
        actionPlan.push({
            step: stepCounter++,
            title: 'Regularizar contratos de encargado de tratamiento con proveedores de Shadow IT',
            description: 'Regularizar los contratos de transferencia de datos con herramientas SaaS de Shadow IT (Art. 15 bis).',
            priority: 'Alta',
            estimatedEffort: '2 días',
            details: 'Identificar y firmar contratos DPA con todos los proveedores de software declarados (ej. AWS, HubSpot, Slack, Zoom, Google Analytics, etc.).'
        });
    }
    // Cap score between 0 and 100
    scoreTotal = Math.max(0, Math.min(100, scoreTotal));
    return {
        scoreTotal,
        riesgoUTM: maxRiskUtm,
        findings,
        actionPlan
    };
}
