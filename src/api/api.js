import axios from 'axios'

export async function get(path, params = {}) {
  const response = await axios({
    method: 'get',
    url: `${path}`,
    params,
    headers: {
      'x-amberdata-blockchain-id': 'ethereum-mainnet',
      'x-api-key': 'UAKf14967e6caca4422f65bfde29ca63d65',
    },
    responseType: 'json',
  })
    .then((res) => res.data)
    .catch((e) => {
      return {
        hasError: true,
        ...e,
      }
    })
  return response
}

export async function post(path, params = {}) {
  const response = await axios({
    method: 'post',
    url: `${path}`,
    params,
    headers: {
      'x-api-key': 'BQY8IPItkNCP0iK8BqvmhSWV1pxpFqrB',
      responseType: 'json',
    },
  })
    .then((res) => res.data)
    .catch((e) => {
      return {
        hasError: true,
        ...e,
      }
    })
  return response
}
