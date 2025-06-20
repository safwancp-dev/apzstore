const PDFDocument=require('pdfkit')
const fs= require('fs')


const genarateInvoice=async(order,filepath)=>{
    try{
        const doc=new PDFDocument()
doc.pipe(fs.createWriteStream(filepath)); 
doc.fontSize(20).text('Invoice', { align: 'center' });
doc.moveDown()
doc.fontSize(14).text(`OrderId:${order._id}`);
doc.text(`User:${order.user.name}`);
doc.text(`Total Amount:${order.totalAmount}`)
doc.text(`Payment Status:${order.paymentMethod}`);
doc.text(`Order Status:${order.status}`);
doc.moveDown()

doc.text('Shipping Address:');
doc.text(`${order.shippingAddress.address}`);
doc.text(`${order.shippingAddress.city}-${order.shippingAddress.postalCode}`);
doc.text(`phone:${order.shippingAddress.phone}`);
doc.moveDown()

doc.text('items:',{underline:true});
order.items.forEach((item,index) => {
    doc.text(`${index + 1}.product:${item.product.name},Quantity:${item.quantity}`)
});

doc.end()
}catch(err){
    console.log('error generating invoice',err)
}
}

module.exports=genarateInvoice;