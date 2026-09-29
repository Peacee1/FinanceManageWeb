$pem = "peacee1_financial_management_key.pem"
$ip = "13.212.179.88"
$user = "ec2-user"

Write-Host "Fixing PEM permissions..."
icacls $pem /inheritance:r
icacls $pem /grant:r "$($env:USERNAME):(R)"

Write-Host "Copying remote_setup.sh to EC2..."
scp -o StrictHostKeyChecking=no -i $pem remote_setup.sh ${user}@${ip}:/home/${user}/remote_setup.sh

Write-Host "Executing script on EC2..."
ssh -o StrictHostKeyChecking=no -i $pem ${user}@${ip} "sed -i 's/\r$//' remote_setup.sh && bash remote_setup.sh"
