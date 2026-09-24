/* Preserve source identity and original scope when summary/detail files mix. */
const loadWithAnalytics=load;
load=async function(files){await loadWithAnalytics(files);
 for(const k of V2.kinds){const legacy=legacyTables[k],t=tables[k];if(!legacy||!t)continue;for(const r of t.rows){const source=legacy.byBatch[r.Batch_ID]||legacy.rows.find(x=>r.QC_Record_ID?.startsWith(x.QC_Record_ID+'-')||r.Checksheet_Record_ID===x.Checksheet_Record_ID||r.Equipment_Event_ID===x.Equipment_Record_ID);if(source){r._line=source._line;r._file=source._file;}}
 }
 if(legacyTables.Batch)for(const r of tables.Batch.rows)r.Reference_Eligible=legacyTables.Batch.byBatch[r.Batch_ID].Reference_Eligible;
 if(legacyTables.QC){const units={pH:'pH',Solids:'wt%',Viscoscosity:'mPa.s',Viscosity:'mPa.s',D50:'nm',D90:'nm',LPC_0p5:'count/mL',LPC_1p0:'count/mL',Zeta:'mV',Fe:'ug/kg'},keys=Object.keys(CMP.limits);for(const q of tables.QC.rows){const b=tables.Batch?.byBatch[q.Batch_ID]?.[0];q.Unit=units[q.Analyte_ID];if(b?.Product_ID==='SIM-OX-01'&&b.Recipe_Rev==='SIM-R01'&&q.Spec_Rev==='SIM-Q01'&&q.Method_ID==='SIM-QC-M01'&&q.Data_Origin==='SYNTHETIC'){const ids=['pH','Solids','Viscosity','D50','D90','LPC_0p5','LPC_1p0','Zeta','Fe'];const limits=CMP.limits[keys[ids.indexOf(q.Analyte_ID)]];q.LSL=limits[0]??'';q.USL=limits[1]??'';q.Spec_Status='DEMO';}}}
 if(legacyTables.Checksheet&&tables.Batch)for(const c of tables.Checksheet.rows){const raw=legacyTables.Checksheet.rows.find(x=>x.Checksheet_Record_ID===c.Checksheet_Record_ID),b=tables.Batch.byBatch[raw.Batch_ID]?.[0];c.Scope_Type='BATCH';c.Scope_ID=raw.Batch_ID;if(b){c.Valid_From_TS=b.Start_TS;c.Valid_To_TS=b.End_TS;}c.Result=['Line_Clearance','Cleaning_Verified','Calibration_Verified','Filter_Identity_Verified','Addition_Order_Verified'].every(k=>raw[k]==='PASS')?'PASS':'FAIL';}
};
const investigateDetail=V2.investigate;
V2.investigate=function(t,bid,opt){const result=investigateDetail(t,bid,{...opt,scope:legacyTables.Checksheet?'BATCH':opt?.scope||'SITE'});return result;};
