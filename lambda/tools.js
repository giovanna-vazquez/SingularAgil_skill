function ConvierteTextoADigitos(textoNumerico){
    var digitos = '';
    
    var arrUnidad = textoNumerico.split(" ");
    
    arrUnidad.forEach(
        function(item){
            switch(item){
                case 'cero': digitos += '0'; break;
                case 'uno': digitos += '1'; break;
                case 'dos': digitos += '2'; break;
                case 'tres': digitos += '3'; break;
                case 'cuatro': digitos += '4'; break;
                case 'cinco': digitos += '5'; break;
                case 'seis': digitos += '6'; break;
                case 'siete': digitos += '7'; break;
                case 'ocho': digitos += '8'; break;
                case 'nueve': digitos += '9'; break;
            }
            
        }
    );

    return digitos;
}