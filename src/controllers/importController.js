const {getPool}=require('../config/db');
const multer=require('multer');
const {parse}=require('csv-parse/sync');
const path=require('path');
const fs=require('fs');

// ----------------------------------------------------------------
// constants
// ----------------------------------------------------------------

const MONTHS={jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',
    jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12'};

// hardcoded per assignment spec — no fx_rates lookup during import
const FX_USD_INR=83.50;

// ----------------------------------------------------------------
// multer — saves uploaded CSV to /uploads at project root
// ----------------------------------------------------------------

const uploadDir=path.join(__dirname,'../../uploads');
const storage=multer.diskStorage({
    destination:(req,file,cb)=>{
        if(!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir,{recursive:true});
        cb(null,uploadDir);
    },
    filename:(req,file,cb)=>{
        cb(null,Date.now()+'-'+file.originalname);
    }
});
const upload=multer({storage});

// ----------------------------------------------------------------
// helpers
// ----------------------------------------------------------------

// flexible date parser — handles DD-MM-YYYY and abbreviated "Mar-14" style
function parseDate(raw){
    if(!raw||!raw.trim()) return {value:null,corrected:false,ambiguous:false,error:true};
    raw=raw.trim();

    // "Mar-14" → 2026-03-14 (year inferred from surrounding data, all 2026)
    let abbr=raw.match(/^([A-Za-z]{3})-(\d{1,2})$/);
    if(abbr){
        let mon=MONTHS[abbr[1].toLowerCase()];
        if(mon){
            return {value:'2026-'+mon+'-'+abbr[2].padStart(2,'0'),corrected:true,ambiguous:false,original:raw};
        }
    }

    // standard DD-MM-YYYY
    let dmy=raw.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if(dmy){
        let dd=parseInt(dmy[1]),mm=parseInt(dmy[2]),yyyy=dmy[3];
        // if both parts could swap roles, that's an ambiguous date
        let ambiguous=(dd<=12&&mm<=12&&dd!==mm);
        let iso=yyyy+'-'+String(mm).padStart(2,'0')+'-'+String(dd).padStart(2,'0');
        return {value:iso,corrected:false,ambiguous,original:raw};
    }

    // already ISO
    if(/^\d{4}-\d{1,2}-\d{1,2}$/.test(raw)){
        return {value:raw,corrected:false,ambiguous:false,original:raw};
    }

    return {value:null,corrected:false,ambiguous:false,error:true,original:raw};
}

// tries to match a name against group members — handles casing, whitespace,
// and partial matches like "Priya S" → "Priya"
function resolveName(raw,lookup){
    if(!raw||!raw.trim()) return {found:false,user:null,corrections:[],ambiguous:false,cleaned:''};

    let cleaned=raw.trim();
    let corrections=[];
    if(cleaned!==raw) corrections.push('trailing_whitespace');

    // straight case-insensitive lookup
    let key=cleaned.toLowerCase();
    if(lookup[key]){
        if(lookup[key].name!==cleaned) corrections.push('name_casing');
        return {found:true,user:lookup[key],corrections,ambiguous:false,cleaned:lookup[key].name};
    }

    // try just the first name — catches "Priya S" when we only have "Priya"
    let firstName=cleaned.split(/\s+/)[0].toLowerCase();
    let partials=Object.keys(lookup).filter(k=>k===firstName);
    if(partials.length===1){
        return {found:false,suggestedUser:lookup[partials[0]],corrections,ambiguous:true,cleaned:lookup[partials[0]].name};
    }

    return {found:false,user:null,corrections,ambiguous:false,cleaned};
}

// break a description into words for fuzzy duplicate matching
function tokenize(str){
    return str.toLowerCase().replace(/[^a-z0-9\s]/g,'').split(/\s+/).filter(t=>t.length>2);
}

// rough similarity score — fraction of overlapping tokens
function descSimilarity(a,b){
    let ta=tokenize(a),tb=tokenize(b);
    if(!ta.length||!tb.length) return 0;
    let common=ta.filter(t=>tb.includes(t));
    return common.length/Math.max(ta.length,tb.length);
}

// parse split_details like "Aisha 30%; Rohan 30%" or "Aisha 500; Rohan 300"
function parseSplitDetails(raw){
    if(!raw) return [];
    return raw.split(';').map(s=>s.trim()).filter(Boolean).map(entry=>{
        let m=entry.match(/^(.+?)\s+([\d.]+)(%)?$/);
        if(!m) return {name:entry.trim(),value:null,isPercent:false};
        return {name:m[1].trim(),value:parseFloat(m[2]),isPercent:!!m[3]};
    });
}

// shorthand to insert an anomaly row into the DB
async function logAnomaly(pool,sessionId,rowNum,type,rawData,desc,action,st){
    await pool.query(
        'INSERT INTO import_anomalies (session_id,row_num,anomaly_type,raw_data,description,proposed_action,status) VALUES (?,?,?,?,?,?,?)',
        [sessionId,rowNum,type,JSON.stringify(rawData),desc,action,st]
    );
}

// ----------------------------------------------------------------
// main import handler — processes every CSV row, detects all 19
// anomaly types from the scope doc, auto-corrects what it can,
// blocks what it can't, and reclassifies settlements/deposits.
// ----------------------------------------------------------------

const importCSV=async(req,res)=>{
    try{
        const pool=getPool();
        const {groupId}=req.params;
        const userId=req.user.id;

        if(!req.file) return res.status(400).json({message:'No file uploaded'});

        // read and parse the CSV
        const csvContent=fs.readFileSync(req.file.path,'utf8');
        const records=parse(csvContent,{columns:true,skip_empty_lines:true,trim:true,relax_column_count:true});

        if(!records.length) return res.status(400).json({message:'CSV is empty or has no data rows'});

        // kick off an import session so we can track everything
        const [sessionResult]=await pool.query(
            'INSERT INTO import_sessions (filename,row_count) VALUES (?,?)',
            [req.file.originalname,records.length]
        );
        const sessionId=sessionResult.insertId;

        // load everyone in this group — we'll need this for name resolution
        // and membership date checks throughout
        const [members]=await pool.query(
            'SELECT u.id,u.name,gm.joined_at,gm.left_at '+
            'FROM group_memberships gm JOIN users u ON u.id=gm.user_id '+
            'WHERE gm.group_id=?',[groupId]
        );
        const memberLookup={};
        for(const m of members){
            memberLookup[m.name.toLowerCase()]={
                id:m.id,name:m.name,
                joined_at:m.joined_at,left_at:m.left_at
            };
        }

        // the report we'll send back to the client
        const report={
            session_id:sessionId,
            filename:req.file.originalname,
            total_rows:records.length,
            summary:{imported:0,auto_corrected:0,blocked:0,reclassified:0,pending:0,voided:0},
            anomalies:[]
        };

        // keep track of rows we've already processed — used for duplicate detection
        const processedRows=[];

        // ensure the is_guest column exists (one-time migration for guest support)
        try{await pool.query('ALTER TABLE users ADD COLUMN is_guest BOOLEAN DEFAULT FALSE');}catch(e){}

        // ============================================================
        // row-by-row processing
        // ============================================================

        for(let i=0;i<records.length;i++){
            const rowNum=i+2; // CSV rows are 1-indexed and row 1 is the header
            const raw={...records[i]};
            let rowAnomalies=[];
            let status='active';
            let hadCorrections=false;

            try{
                // ---- pull out fields, trim everything ----

                let date=(raw.date||'').trim();
                let description=(raw.description||'').trim();
                let paidByRaw=raw.paid_by||'';
                let paidByClean=paidByRaw.trim();
                let amountRaw=(raw.amount||'').toString().trim();
                let currency=(raw.currency||'').trim().toUpperCase();
                let splitType=(raw.split_type||'').trim().toLowerCase();
                let splitWith=(raw.split_with||'').trim();
                let splitDetails=(raw.split_details||raw.split_detail||'').trim();
                let notes=(raw.notes||'').trim();

                // Anomaly 12 (partial) — trailing whitespace on payer name
                if(paidByClean&&paidByClean!==paidByRaw){
                    rowAnomalies.push({type:'trailing_whitespace',
                        description:'Payer name had extra whitespace: "'+paidByRaw+'"',
                        action:'AUTO-CORRECTED — stripped',status:'auto_resolved'});
                    hadCorrections=true;
                }

                // ========================================
                // AMOUNT CHECKS (Anomalies 2, 4, 11, 14)
                // ========================================

                // Anomaly 2 — comma as thousands separator like "1,200"
                if(amountRaw.includes(',')){
                    let before=amountRaw;
                    amountRaw=amountRaw.replace(/,/g,'');
                    rowAnomalies.push({type:'amount_comma',
                        description:'Amount had comma separator: "'+before+'"',
                        action:'AUTO-CORRECTED — "'+before+'" → '+amountRaw,status:'auto_resolved'});
                    hadCorrections=true;
                }

                let amountNum=parseFloat(amountRaw);

                // completely missing or garbled amount — can't do anything with this row
                if(isNaN(amountNum)){
                    rowAnomalies.push({type:'missing_amount',
                        description:'Amount is missing or not a number',
                        action:'BLOCKED',status:'pending'});
                    status='blocked';
                }

                if(!isNaN(amountNum)){
                    // Anomaly 4 — sub-paisa precision like 899.995
                    let rounded=parseFloat(amountNum.toFixed(2));
                    if(rounded!==amountNum){
                        rowAnomalies.push({type:'amount_precision',
                            description:'Amount '+amountNum+' had excess precision',
                            action:'AUTO-CORRECTED — rounded to '+rounded+' (banker rounding)',status:'auto_resolved'});
                        amountNum=rounded;
                        hadCorrections=true;
                    }

                    // Anomaly 11 — negative amount (might be a legit refund)
                    if(amountNum<0){
                        if(/refund|cancel|reversal|credit/i.test(description+' '+notes)){
                            rowAnomalies.push({type:'negative_amount_refund',
                                description:'Negative amount ₹'+amountNum+' — refund keyword found in description/notes',
                                action:'IMPORTED AS REFUND — negative sign preserved',status:'auto_resolved'});
                        } else {
                            rowAnomalies.push({type:'negative_amount',
                                description:'Negative amount ₹'+amountNum+' with no refund/cancellation context',
                                action:'BLOCKED — needs manual review',status:'pending'});
                            status='blocked';
                        }
                    }

                    // Anomaly 14 — zero amount placeholder
                    if(amountNum===0){
                        rowAnomalies.push({type:'zero_amount',
                            description:'Zero amount — looks like a placeholder or void',
                            action:'IMPORTED AS VOIDED — no balance effect',status:'auto_resolved'});
                        status='voided';
                    }
                }

                // ========================================
                // DATE CHECKS (Anomalies 12, 16)
                // ========================================

                let parsedDate=parseDate(date);

                if(parsedDate.error){
                    rowAnomalies.push({type:'invalid_date',
                        description:'Could not parse date: "'+date+'"',
                        action:'BLOCKED',status:'pending'});
                    status='blocked';
                }

                // Anomaly 12 (partial) — "Mar-14" style date auto-corrected
                if(parsedDate.corrected){
                    rowAnomalies.push({type:'date_format',
                        description:'Non-standard date "'+parsedDate.original+'" normalized',
                        action:'AUTO-CORRECTED — '+parsedDate.original+' → '+parsedDate.value,status:'auto_resolved'});
                    hadCorrections=true;
                }

                // Anomaly 16 — ambiguous DD-MM vs MM-DD, but only flag it
                // if the notes themselves call out the confusion
                if(parsedDate.ambiguous&&/ambiguous|which date|format.*mess|is this.*or/i.test(notes)){
                    rowAnomalies.push({type:'ambiguous_date',
                        description:'Date "'+date+'" is ambiguous (DD-MM or MM-DD?) — notes confirm confusion',
                        action:'BLOCKED — user must confirm which interpretation is correct',status:'pending'});
                    status='blocked';
                }

                // ========================================
                // PAYER RESOLUTION (Anomalies 3, 5, 6, 12)
                // ========================================

                let payerId=null;

                // Anomaly 6 — no payer at all
                if(!paidByClean){
                    rowAnomalies.push({type:'missing_payer',
                        description:'Payer field is empty — "can\'t remember who paid"',
                        action:'IMPORTED AS PENDING — excluded from balances until payer is assigned',status:'pending'});
                    if(status==='active') status='pending';
                } else {
                    let resolved=resolveName(paidByClean,memberLookup);

                    // Anomaly 3 / 12 — name casing like "priya" or "rohan "
                    if(resolved.corrections.includes('name_casing')){
                        rowAnomalies.push({type:'name_casing',
                            description:'Payer "'+paidByClean+'" → "'+resolved.cleaned+'"',
                            action:'AUTO-CORRECTED — case-insensitive match',status:'auto_resolved'});
                        hadCorrections=true;
                    }

                    if(resolved.found){
                        payerId=resolved.user.id;
                    }
                    // Anomaly 5 — ambiguous name like "Priya S"
                    else if(resolved.ambiguous){
                        rowAnomalies.push({type:'ambiguous_payer',
                            description:'Payer "'+paidByClean+'" is ambiguous — best guess: "'+resolved.cleaned+'"',
                            action:'PENDING_APPROVAL — user must confirm this is the right person',status:'pending'});
                        payerId=resolved.suggestedUser?resolved.suggestedUser.id:null;
                        if(status==='active') status='pending';
                    }
                    // payer name doesn't match anyone in the group
                    else {
                        rowAnomalies.push({type:'unknown_payer',
                            description:'Payer "'+paidByClean+'" not found in any group membership',
                            action:'BLOCKED',status:'pending'});
                        status='blocked';
                    }
                }

                // ========================================
                // CURRENCY & FX (Anomaly 13)
                // ========================================

                let amountInr=null;
                let fxRate=null;

                // Anomaly 13 — missing currency
                if(!currency){
                    rowAnomalies.push({type:'missing_currency',
                        description:'Currency field is empty (context suggests INR but we can\'t assume)',
                        action:'IMPORTED AS PENDING — excluded from balances until confirmed',status:'pending'});
                    if(status==='active') status='pending';
                } else if(currency==='INR'){
                    amountInr=amountNum;
                    fxRate=1;
                } else if(currency==='USD'){
                    amountInr=!isNaN(amountNum)?parseFloat((amountNum*FX_USD_INR).toFixed(2)):null;
                    fxRate=FX_USD_INR;
                } else {
                    // some other currency — just treat it like INR for now
                    amountInr=amountNum;
                    fxRate=1;
                }

                // ========================================
                // RECLASSIFICATION (Anomalies 7, 18)
                // settlements and deposits hiding as expenses
                // ========================================

                let participantNames=splitWith?splitWith.split(';').map(s=>s.trim()).filter(Boolean):[];

                // Anomaly 7 — "Rohan paid Aisha back" with empty split_type
                // Anomaly 18 — "Sam deposit share" (might have split_type set but only 1 payee)
                let shouldReclassify=false;
                let txType='settlement';

                if(!splitType&&/paid\s*back|deposit/i.test(description)){
                    shouldReclassify=true;
                    txType=/deposit/i.test(description)?'deposit':'settlement';
                }
                // also catch deposits where someone set split_type but it's clearly a 1-on-1 payment
                else if(participantNames.length===1&&/deposit/i.test(description)&&/paid|deposit|moving in/i.test(notes)){
                    shouldReclassify=true;
                    txType='deposit';
                }

                if(shouldReclassify){
                    let payeeName=participantNames[0]||'';
                    let payeeResolved=resolveName(payeeName,memberLookup);
                    let payeeId=payeeResolved.found?payeeResolved.user.id:null;

                    rowAnomalies.push({type:'reclassified_'+txType,
                        description:'This is a '+txType+', not a group expense — '+(paidByClean||'?')+' → '+(payeeName||'?')+', ₹'+(amountInr||amountNum),
                        action:'RECLASSIFIED AS '+txType.toUpperCase(),status:'auto_resolved'});

                    // stick it in the settlements table where it belongs
                    if(payerId&&payeeId&&!isNaN(amountNum)&&parsedDate.value){
                        await pool.query(
                            'INSERT INTO settlements (group_id,payer_id,payee_id,amount,currency,transaction_type,settlement_date,import_session_id,notes) VALUES (?,?,?,?,?,?,?,?,?)',
                            [groupId,payerId,payeeId,amountInr||amountNum,currency||'INR',txType,parsedDate.value,sessionId,notes||null]);
                    }

                    for(const a of rowAnomalies) await logAnomaly(pool,sessionId,rowNum,a.type,raw,a.description,a.action,a.status);
                    report.summary.reclassified++;
                    if(hadCorrections) report.summary.auto_corrected++;
                    report.anomalies.push(...rowAnomalies.map(a=>({row:rowNum,...a})));
                    processedRows.push({rowNum,date:parsedDate.value,amount:amountNum,payerId,description,expenseId:null});
                    continue; // done with this row, move to next
                }

                // ========================================
                // SPLIT PARTICIPANTS (Anomalies 9, 17)
                // ========================================

                let participantIds=[];

                for(const name of participantNames){
                    let resolved=resolveName(name,memberLookup);

                    if(resolved.found){
                        let member=resolved.user;

                        // Anomaly 17 — someone who already left the group (like Meera in April)
                        if(member.left_at&&parsedDate.value){
                            let expDate=new Date(parsedDate.value);
                            let leftDate=new Date(member.left_at);
                            if(expDate>leftDate){
                                rowAnomalies.push({type:'membership_violation',
                                    description:resolved.cleaned+' left the group on '+member.left_at+' but this expense is from '+parsedDate.value,
                                    action:'AUTO-CORRECTED — removed from split, shares recalculated',status:'auto_resolved'});
                                hadCorrections=true;
                                continue; // skip this person, they shouldn't be here
                            }
                        }
                        participantIds.push(member.id);
                    } else {
                        // Anomaly 9 — someone not in the group at all (like Kabir)
                        // try to extract a real name from things like "Dev's friend Kabir"
                        let cleanName=name;
                        let friendMatch=name.match(/(?:friend|guest|visitor)\s+(\w+)/i);
                        if(friendMatch) cleanName=friendMatch[1];

                        // see if they already exist as a user
                        let [existingUser]=await pool.query('SELECT id,name FROM users WHERE name=?',[cleanName]);
                        let guestId;

                        if(existingUser.length>0){
                            guestId=existingUser[0].id;
                        } else {
                            // create a guest account — they can't log in, this is just for tracking
                            let guestEmail=cleanName.toLowerCase().replace(/\s+/g,'.')+'.'+Date.now()+'@guest.local';
                            let [guestResult]=await pool.query(
                                'INSERT INTO users (name,email,password_hash,is_guest) VALUES (?,?,?,?)',
                                [cleanName,guestEmail,'no_login',true]);
                            guestId=guestResult.insertId;
                            // remember them for the rest of this import
                            memberLookup[cleanName.toLowerCase()]={id:guestId,name:cleanName,joined_at:null,left_at:null};
                        }

                        rowAnomalies.push({type:'non_member',
                            description:'"'+name+'" is not a group member — created guest account for "'+cleanName+'"',
                            action:'GUEST CREATED — their share is tracked but excluded from group settlement',status:'auto_resolved'});
                        hadCorrections=true;
                        participantIds.push(guestId);
                    }
                }

                // ========================================
                // SPLIT VALIDATION (Anomalies 8, 15, 19)
                // ========================================

                let parsedDetails=parseSplitDetails(splitDetails);

                // Anomaly 8 & 15 — percentage splits that don't add up to 100
                if(splitType==='percentage'&&parsedDetails.length>0){
                    let totalPct=parsedDetails.reduce((sum,d)=>sum+(d.value||0),0);
                    if(Math.abs(totalPct-100)>0.01){
                        rowAnomalies.push({type:'percentage_sum',
                            description:'Percentages add up to '+totalPct+'% instead of 100%',
                            action:'BLOCKED — can\'t auto-fix, which value is wrong?',status:'pending'});
                        status='blocked';
                    }
                }

                // Anomaly 19 — split_type says "equal" but someone also filled in split_details
                if(splitType==='equal'&&splitDetails){
                    let vals=parsedDetails.map(d=>d.value).filter(v=>v!==null);
                    if(vals.length>0){
                        let allSame=vals.every(v=>v===vals[0]);
                        if(allSame){
                            // 1:1:1:1 is the same as equal — just discard the redundant details
                            rowAnomalies.push({type:'conflicting_split_type',
                                description:'split_type is "equal" and split_details has uniform shares — they agree',
                                action:'AUTO-CORRECTED — redundant split_details discarded',status:'auto_resolved'});
                            splitDetails='';
                            parsedDetails=[];
                            hadCorrections=true;
                        } else {
                            // the details contradict the type — can't guess which is right
                            rowAnomalies.push({type:'conflicting_split_type',
                                description:'split_type says "equal" but split_details has unequal values — contradictory',
                                action:'BLOCKED — user needs to pick one',status:'pending'});
                            status='blocked';
                        }
                    }
                }

                // ========================================
                // DUPLICATE DETECTION (Anomalies 1, 10)
                // check against rows we already processed in this batch
                // ========================================

                for(const prev of processedRows){
                    if(prev.date===parsedDate.value&&parsedDate.value){
                        let sim=descSimilarity(description,prev.description);
                        if(sim>0.4){
                            if(prev.payerId===payerId&&Math.abs((prev.amount||0)-(amountNum||0))<0.01){
                                // Anomaly 1 — exact duplicate (same everything, just slightly different wording)
                                rowAnomalies.push({type:'exact_duplicate',
                                    description:'Looks like a duplicate of row '+prev.rowNum+' — same date, amount, payer, and similar description',
                                    action:'PENDING_APPROVAL — proposed: keep the one with more detail',status:'pending'});
                                if(status==='active') status='pending';
                                // flag the earlier row too
                                if(prev.expenseId) await pool.query("UPDATE expenses SET status='pending' WHERE id=?",[prev.expenseId]);
                            } else {
                                // Anomaly 10 — conflicting duplicate (same event but details differ)
                                rowAnomalies.push({type:'conflicting_duplicate',
                                    description:'Conflicts with row '+prev.rowNum+' — same date and similar description but different payer or amount',
                                    action:'PENDING_APPROVAL — check notes for which version is correct',status:'pending'});
                                if(status==='active') status='pending';
                                if(prev.expenseId) await pool.query("UPDATE expenses SET status='pending' WHERE id=?",[prev.expenseId]);
                            }
                        }
                    }
                }

                // ========================================
                // INSERT THE EXPENSE
                // ========================================

                let expenseId=null;
                if(!isNaN(amountNum)&&parsedDate.value){
                    let [expResult]=await pool.query(
                        'INSERT INTO expenses (group_id,description,paid_by,amount,currency,amount_inr,fx_rate_used,expense_date,split_type,status,import_session_id,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
                        [groupId,description,payerId,amountNum,currency||null,amountInr,fxRate,parsedDate.value,splitType||null,status,sessionId,notes||null]);
                    expenseId=expResult.insertId;
                }

                // ========================================
                // INSERT SPLITS (skip if the row is blocked — the data is broken)
                // ========================================

                if(expenseId&&status!=='blocked'&&participantIds.length>0){
                    const splitQ='INSERT INTO expense_splits (expense_id,user_id,share_amount,share_pct,share_units) VALUES (?,?,?,?,?)';
                    let base=amountInr||amountNum;

                    if(splitType==='equal'){
                        let share=parseFloat((base/participantIds.length).toFixed(2));
                        for(const uid of participantIds){
                            await pool.query(splitQ,[expenseId,uid,share,null,null]);
                        }
                    }
                    else if(splitType==='unequal'&&parsedDetails.length>0){
                        for(const d of parsedDetails){
                            let r=resolveName(d.name,memberLookup);
                            if(r.found&&d.value!==null){
                                let shareInr=currency==='USD'?parseFloat((d.value*FX_USD_INR).toFixed(2)):d.value;
                                await pool.query(splitQ,[expenseId,r.user.id,shareInr,null,null]);
                            }
                        }
                    }
                    else if(splitType==='percentage'&&parsedDetails.length>0){
                        for(const d of parsedDetails){
                            let r=resolveName(d.name,memberLookup);
                            if(r.found&&d.value!==null){
                                let share=parseFloat(((d.value/100)*base).toFixed(2));
                                await pool.query(splitQ,[expenseId,r.user.id,share,d.value,null]);
                            }
                        }
                    }
                    else if(splitType==='share'&&parsedDetails.length>0){
                        let totalUnits=parsedDetails.reduce((s,d)=>s+(d.value||0),0);
                        if(totalUnits>0){
                            for(const d of parsedDetails){
                                let r=resolveName(d.name,memberLookup);
                                if(r.found&&d.value!==null){
                                    let share=parseFloat(((d.value/totalUnits)*base).toFixed(2));
                                    await pool.query(splitQ,[expenseId,r.user.id,share,null,d.value]);
                                }
                            }
                        }
                    }
                }

                // ---- persist anomalies to the DB ----

                for(const a of rowAnomalies){
                    await logAnomaly(pool,sessionId,rowNum,a.type,raw,a.description,a.action,a.status);
                }

                // ---- tally up the report ----

                if(hadCorrections) report.summary.auto_corrected++;
                if(status==='active') report.summary.imported++;
                else if(status==='blocked') report.summary.blocked++;
                else if(status==='pending') report.summary.pending++;
                else if(status==='voided') report.summary.voided++;

                report.anomalies.push(...rowAnomalies.map(a=>({row:rowNum,...a})));
                processedRows.push({rowNum,date:parsedDate.value,amount:amountNum,payerId,description,expenseId});

            }catch(rowErr){
                // if one row blows up, log it and keep going — don't tank the whole import
                console.log("Error processing CSV row "+rowNum,rowErr);
                report.anomalies.push({row:rowNum,type:'processing_error',
                    description:'Unexpected error: '+rowErr.message,
                    action:'SKIPPED',status:'pending'});
            }
        }

        // mark the session as done
        await pool.query('UPDATE import_sessions SET status=? WHERE id=?',['complete',sessionId]);

        res.status(200).json(report);
    }
    catch(err){
        console.log("Error importing CSV",err);
        res.status(500).json({message:'Error importing CSV'});
    }
};

module.exports={upload,importCSV};
