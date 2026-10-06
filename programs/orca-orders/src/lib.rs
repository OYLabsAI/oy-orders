use solana_program::{account_info::{next_account_info,AccountInfo}, entrypoint, entrypoint::ProgramResult, program::invoke_signed, program_error::ProgramError, pubkey::Pubkey, system_instruction, system_program, sysvar::{rent::Rent,clock::Clock,Sysvar}};
entrypoint!(process);
const LEN: usize = 328;
fn fail() -> ProgramError { ProgramError::InvalidArgument }
fn number(data:&[u8],offset:usize)->u64 { u64::from_le_bytes(data[offset..offset+8].try_into().unwrap()) }
fn put(data:&mut [u8],offset:usize,value:u64) { data[offset..offset+8].copy_from_slice(&value.to_le_bytes()); }
pub fn process(program:&Pubkey,accounts:&[AccountInfo],data:&[u8])->ProgramResult {
    let mut iter=accounts.iter(); let signer=next_account_info(&mut iter)?; let order=next_account_info(&mut iter)?; let destination=next_account_info(&mut iter)?;
    if !signer.is_signer { return Err(ProgramError::MissingRequiredSignature); }
    let tag=*data.first().ok_or(fail())?; let now=Clock::get()?.unix_timestamp;
    if tag==0 {
        if data.len()!=185 || order.lamports()!=0 || order.owner!=&system_program::ID || destination.key!=&system_program::ID { return Err(fail()); }
        let nonce=&data[1..33]; let (key,bump)=Pubkey::find_program_address(&[b"order",signer.key.as_ref(),nonce],program);
        if order.key!=&key { return Err(ProgramError::InvalidSeeds); }
        let reward=number(data,161);let deadline=number(data,169);let ceiling=number(data,177);
        if reward==0 || ceiling==0 || deadline<=now as u64 || deadline>(now+3600) as u64 {return Err(fail());}
        let lamports=Rent::get()?.minimum_balance(LEN).checked_add(reward).ok_or(fail())?;
        invoke_signed(&system_instruction::create_account(signer.key,order.key,lamports,LEN as u64,program),&[signer.clone(),order.clone(),destination.clone()],&[&[b"order",signer.key.as_ref(),nonce,&[bump]]])?;
        let mut d=order.try_borrow_mut_data()?;d[0]=1;d[2]=bump;d[8..40].copy_from_slice(nonce);d[40..72].copy_from_slice(signer.key.as_ref());d[72..104].copy_from_slice(&data[97..129]);d[104..136].copy_from_slice(&data[129..161]);d[136..168].copy_from_slice(&data[33..65]);d[168..200].copy_from_slice(&data[65..97]);put(&mut d,296,reward);put(&mut d,304,deadline);put(&mut d,312,ceiling);return Ok(());
    }
    if order.owner!=program || order.data_len()!=LEN || !order.is_writable { return Err(ProgramError::IncorrectProgramId); }
    let mut d=order.try_borrow_mut_data()?;
    let buyer=Pubkey::new_from_array(d[40..72].try_into().unwrap());let worker=Pubkey::new_from_array(d[72..104].try_into().unwrap());let authority=Pubkey::new_from_array(d[104..136].try_into().unwrap());
    let (key,bump)=Pubkey::find_program_address(&[b"order",buyer.as_ref(),&d[8..40]],program);if &key!=order.key || d[0]!=1 || bump!=d[2] {return Err(ProgramError::InvalidSeeds);}
    let deadline=number(&d,304);let reward=number(&d,296);
    match tag {
        1=>{
            if data.len()!=105 || signer.key!=&worker || d[1]!=0 || now as u64>=deadline {return Err(fail());}
            let amount=number(data,33);
            if amount==0 || amount>number(&d,312) || data[41..73]!=d[168..200] || data[73..105]!=d[136..168] {return Err(fail());}
            d[200..232].copy_from_slice(&data[1..33]);put(&mut d,320,amount);d[1]=1;
        }
        2=>{
            if data.len()!=97 || signer.key!=&authority || destination.key!=&worker || d[1]!=1 || now as u64>=deadline || data[1..33]!=d[200..232] || data[33..65].iter().all(|n| *n==0) || data[65..97].iter().all(|n| *n==0) {return Err(fail());}
            d[232..264].copy_from_slice(&data[33..65]);d[264..296].copy_from_slice(&data[65..97]);d[1]=2;
            drop(d);pay(order,destination,reward)?;
        }
        3=>{
            if data.len()!=1 || signer.key!=&buyer || destination.key!=&buyer || d[1]>1 || (now as u64)<deadline {return Err(fail());}
            d[1]=3;drop(d);pay(order,destination,reward)?;
        }
        _=>return Err(ProgramError::InvalidInstructionData),
    }
    Ok(())
}
fn pay(order:&AccountInfo,destination:&AccountInfo,amount:u64)->ProgramResult {
    let remain=order.lamports().checked_sub(amount).ok_or(ProgramError::InsufficientFunds)?;
    let receive=destination.lamports().checked_add(amount).ok_or(fail())?;
    **order.try_borrow_mut_lamports()?=remain;**destination.try_borrow_mut_lamports()?=receive;Ok(())
}
