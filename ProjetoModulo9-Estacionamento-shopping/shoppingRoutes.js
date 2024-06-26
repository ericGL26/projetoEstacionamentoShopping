const mongoose = require('mongoose')
const axios = require('axios')

const usuarioSchemaRegistros = new mongoose.Schema({
    Nome: {
        type: String,
        required: true
    },
    Carro: {
        type: String,
        required: true
    },
    Placa: {
        type: String,
        required: true
    },
    HoraEntrada: {
        type: Date,
        required: true
    }
})

const vagaSchema = new mongoose.Schema({
    VagasLivres: {
        type: Number,
        required: true
    },
    TotalVagas: {
        type: Number,
        required: false
    }
})

const CaixaSchema = new mongoose.Schema({
    Saldo: {
        type: Number
    }
})


const Usuario = mongoose.model('Usuario', usuarioSchemaRegistros, 'registros')
const VagasShopping = mongoose.model('Vaga', vagaSchema, 'Vagas')
const Caixa = mongoose.model('Caixa', CaixaSchema, 'Caixa')


async function AlterarSaldoCaixa(ValorAPagar) {
    await Caixa.updateOne(
        { $inc: {Saldo: ValorAPagar}}
    )
}

async function GerenciarVagas(acao) {
    let { VagasLivres } = await VagasShopping.findOne({});

    if(acao == 'retirar'){
        VagasLivres = VagasLivres - 1
    }else if (acao == 'adicionar'){
        VagasLivres = VagasLivres + 1
    }
   
    await VagasShopping.updateOne(
        { $set: {VagasLivres: VagasLivres}}
    )
}

async function ApagarUsuarioNoRegistro(PlacaUsuario) {
    const placa = {Placa: PlacaUsuario}
    console.log('PLacaUSuario', placa)
    try{
        const DeletarUsuario = await Usuario.deleteOne(placa)
        return DeletarUsuario
    }catch(error){
        console.log('Algo deu errado em apagar registro')
        return;
    }
}

async function CalcularTempoQueUsuarioFicaNoEstacionamento(DiferencaDeTempo) {
    const horas = Math.floor((DiferencaDeTempo / 1000) / 60 / 60);
    const minutos = Math.floor((DiferencaDeTempo / 1000) / 60) % 60;
    const segundos = Math.floor(DiferencaDeTempo / 1000) % 60;
    return [segundos, minutos, horas]
}

async function validaInformacaoRotaRegistrar(DadosRotaRegistrar) {
    const dados = DadosRotaRegistrar

    const PlacaCarroUsuario = dados.Placa
    const DataHoraEntradaUsuario = dados.HoraEntrada


    const regexPlaca = /^[A-Za-z]{3}\d[A-Za-z]\d{2}$/;
    const regexData = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;


    if(regexPlaca.test(PlacaCarroUsuario) && regexData.test(DataHoraEntradaUsuario)){
        console.log('Placa e data valida')
        return 'placa e data valida'
    }else{
        console.log('Placa e data invalida')
        return 'placa ou data invalida'
    }

}

async function validaInformacaoRotaFecharConta(DadosRotaFecharConta) {

}

async function BuscarDadosBancoRegistros(PlacaUsuario){
    const Registros = await Usuario.find({Placa: "tamsadesinmuitomuitomuito"})
    console.log('Registros aqui ->', Registros)
}

/*
async function ValidaHoraSaidaEHoraEntrada(HoraEntrada, HoraSaida) {
    console.log('HoraENtrada', HoraEntrada)
    console.log('typeofhonraentrada', typeof(HoraEntrada))
    
    const regexHoraEntradaESaida = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])T([01]\d|2[0-3]):([0-5]\d):([0-5]\d)(\.\d+)?(Z|[+-]([01]\d|2[0-3]):?([0-5]\d))$/;
    if(regexHoraEntradaESaida.test(HoraEntrada) ||regexHoraEntradaESaida.test(HoraSaida) ){
        return 'Regex passou'
    }else {
        return 'Regex nao passou'
    }
}
*/
function CriarRotasApiShopping() {
    const RotasApiShopping = [
        {
            method: 'POST',
            path: '/Registrar',
            handler: async (request, h) => {

                    const Vagas = await VagasShopping.find({})
                    const RespostaRotaVaga = Vagas[0].VagasLivres;
                    const validacaoinformacaorotaregistrar = await validaInformacaoRotaRegistrar(request.payload)
                    BuscarDadosBancoRegistros()

                console.log(RespostaRotaVaga, "<-")
                if(RespostaRotaVaga != 0){
                    if(validacaoinformacaorotaregistrar == 'placa e data valida'){
                        try{
                            const { Nome, Carro, Placa, HoraEntrada } = request.payload;
                            const novoUsuario = new Usuario({ Nome, Carro, Placa, HoraEntrada });
                            await novoUsuario.save()
                            GerenciarVagas('retirar')       
                            return 'Usuário cadastrado com sucesso'
    
                        }catch(error){
                            console.log('Deu ruim!, bloco try falhou!', error)
                        }
                    }else{
                        console.log('Placa ou data inválida');
                        return 'Placa ou data inválida'
                    }
              
                }else{
                    console.log('Garagem lotada')
                    return 'Garagem lotada'
                }

            }
        },

        {
            method: 'POST',
            path: '/FecharConta',
            handler: async (request, h) => {
               try{
                const Requisicao = request.payload;
                console.log('Requisicao rota fecharConta', Requisicao)
                const Placa = Requisicao.Placa
                const HoraSaida = new Date(Requisicao.HoraSaida)
                const ResultadoRegistro = await Usuario.find({ Placa: Placa });
                if(ResultadoRegistro == undefined || null || ResultadoRegistro.length === 0 ){
                    console.log('Nao foi possivel definir um valor para ResultadoRegistro pois provavelmento o usuario nao existe no banco')
                    return {mensagem: 'Usuario não encontrado'}
                }
                const HoraEntrada = new Date(ResultadoRegistro[0].HoraEntrada)
                
                const DiferencaDeTempo = HoraSaida.getTime() - HoraEntrada.getTime();
                const minutos = Math.floor((DiferencaDeTempo / 1000) / 60)
                const PrecoPorMinuto = 0.10
                const ValorAPagar = PrecoPorMinuto * minutos

                const diferenca_tempo = await CalcularTempoQueUsuarioFicaNoEstacionamento(DiferencaDeTempo)
                return {
                    message: "Conta fechada com sucesso",
                    tempo_no_estacionamento : `${diferenca_tempo[2]} horas ${diferenca_tempo[1]} minutos  e ${diferenca_tempo[0]} segundos`,
                    valor: ValorAPagar
                } 
                
               }catch(error){   
                console.log('Deu ruim', error)
               }
            }
        },

        {
            method: 'POST',
            path: '/Pagar',
            handler: async (request, h) => {
                try {
                    const Requisicao = request.payload
                    const Placa = Requisicao.Placa
                    const ValorAPagar = Requisicao.ValorAPagar

                    AlterarSaldoCaixa(ValorAPagar)

                    GerenciarVagas('adicionar')

                    ApagarUsuarioNoRegistro(Placa)
                    return 'Pagamento foi realizado com sucesso'
                }catch(error){
                    console.log('Error no pagamento', error)
                    return 'Erro no pagamento'
                }
               
            }
        }


    ]
    return RotasApiShopping
}

module.exports = CriarRotasApiShopping