import { axios } from "axios";

export async function register(username,email,password){

    try{
        const response=axios.post('http://localhost:3000/api/auth/register',{
        username,email,password
    },{
        withCredentials:true
    })
    return response.data
    }catch(err){
        console.log(err)
    }
    
}

export async function login(email,password){

    try{
        const response=axios.post('http://localhost:3000/api/auth/login',{
            email,password
        },{
            withCredentials:true
        })
    }catch(err){
        console.log(err)
    }
}