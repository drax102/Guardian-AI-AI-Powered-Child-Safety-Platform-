import { useEffect,useState } from "react"
import axios from "axios"

function App(){

const [alerts,setAlerts]=useState([])

useEffect(()=>{

load()

},[])

async function load(){

const res=
await axios.get(
"http://127.0.0.1:8000/alerts"
)

setAlerts(res.data)

}

return(

<div
style={{

background:"#111827",

minHeight:"100vh",

padding:"40px",

color:"white"

}}
>

<h1
style={{

fontSize:"40px",

marginBottom:"40px"

}}
>

🛡 GuardianAI

</h1>

{

alerts.map((a)=>(

<div

key={a._id}

style={{

background:"#1f2937",

borderRadius:"20px",

padding:"20px",

marginBottom:"30px"

}}

>

<div
style={{
display:"flex",
gap:"30px"
}}
>

<img

src={a.image_url}

style={{

width:"250px",

height:"250px",

objectFit:"cover",

borderRadius:"20px"

}}

/>

<div>

<h2>

⚠ {a.type}

</h2>

<h3>

Severity:
<span
style={{
color:
a.severity==="high"
?

"red"

:

"orange"
}}
>

 {a.severity}

</span>

</h3>

<p>

{a.message}

</p>

</div>

</div>

</div>

))

}

</div>

)

}

export default App